import {
  AUTH_EXCHANGE,
  BUKETY_MAX_RETRIES,
  BUKETY_MAX_TIMEOUT,
  QUEUE,
} from "../constants";
import logger from "../lib/logger";
import retry from "async-retry";
import amqp from "amqplib";
export class AuthConsumer {
  private channel: amqp.Channel | null = null;
  private connection: amqp.Connection | null = null;
  async init() {
    if (!process.env.RABBITMQ_URL) {
      throw new Error("RABBITMQ_URL environment variable is not set");
    }
    try {
      await retry(
        async () => {
          this.connection = (await amqp.connect(
            process.env.RABBITMQ_URL!
          )) as unknown as amqp.Connection;
          if (!this.connection) {
            logger.error("Failed to establish RabbitMQ connection");
            throw new Error("Failed to establish RabbitMQ connection");
          }
          if (!this.channel) {
            throw new Error("Failed to create RabbitMQ channel");
          }

          // Setting prefetch to control message flow
          await this.channel.prefetch(100);

          // Setting up exchanges, queues, and consumers
          await this.connectChannel();
        },
        {
          retries: BUKETY_MAX_RETRIES,
          factor: 2,
          minTimeout: BUKETY_MAX_TIMEOUT,
          maxTimeout: BUKETY_MAX_TIMEOUT * 4,
          randomize: true,
          onRetry: (error) => logger.warn("Retrying initialization", { error }),
        }
      );
    } catch (error) {
      logger.error("Failed to initialize RabbitMQ connection", { error });
      throw error;
    }
  }
  async connectChannel() {
    try {
      if (!this.channel) {
        logger.error(`Auth Consumer Channel has not been initialized`);
        throw new Error("Auth Consumer Channel has not been initialized");
      }
      // declared exchange, queue, and also bind queue to exchange using the right routing key
      await this.channel?.assertExchange(AUTH_EXCHANGE, "topic", {
        durable: true,
      });
      for (let [topic, queue] of Object.entries(QUEUE)) {
        await this.channel?.assertQueue(queue, { durable: true });
        await this.channel?.bindQueue(queue, AUTH_EXCHANGE, topic);
      }
      //   CONSUMING THE MESSAGES
      for (let [topic, queue] of Object.entries(QUEUE)) {
        logger.info(`Consuming ${queue} queue for the routing key: ${topic}`);
        this.channel?.consume(
          queue,
          async (msg) => {
            if (!msg) return;
            try {
              const payload = JSON.parse(msg.content.toString());
              logger.info("Processing Message:", payload);
              this.channel?.ack(msg);
            } catch (error) {}
          },
          { noAck: false }
        );
      }
    } catch (error: any) {
      logger.error(`channel connection error`, {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async disconnectChannel() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      // if (this.connection) {
      //   await this.connection.close();
      //   this.connection = null;
      // }
    } catch (error) {
      logger.error("Failed to disconnect Auth Channel", { error });
    }
  }
}
