import {
  AUTH_EXCHANGE,
  BOOKETY_AUTH_2FA_NOTIFICATION_TOPIC,
  BOOKETY_AUTH_RESET_PASSWORD_TOKEN_NOTIFICATION_TOPIC,
  BOOKETY_AUTH_SIGNIN_NOTIFICATION_TOPIC,
  BUKETY_MAX_RETRIES,
  BUKETY_MAX_TIMEOUT,
  NOTIFICATION_EXCHANGE,
} from "../constants";
import logger from "../lib/logger";
import retry from "async-retry";
import amqp from "amqplib";
export class AuthProducer {
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

          // Set prefetch to control message flow
          await this.channel.prefetch(100);

          // Set up exchanges, queues, and Producers
          await this.connectProducer();
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
  async connectProducer() {
    try {
      if (!this.channel) {
        logger.error(`Auth Producer Channel has not been initialized`);
        throw new Error("Auth Producer Channel has not been initialized");
      }
      // declared exchange, queue, and also bind queue to exchange using the right routing key
      await this.channel?.assertExchange(AUTH_EXCHANGE, "topic", {
        durable: true,
      });
      await this.channel?.assertExchange(NOTIFICATION_EXCHANGE, "topic", {
        durable: true,
      });
      logger.info(`Auth Producer Channel's Exchange has been initialized`);
    } catch (error: any) {
      logger.error(`channel connection error`, {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async sendMessage(topic: string, message: any) {
    if (!this.channel) {
      this.init();
    }
    try {
      if (!this.channel) {
        logger.error(`Auth Producer Channel has not been initialized`);
        throw new Error("Auth Producer Channel has not been initialized");
      }
      const exchange = [
        BOOKETY_AUTH_2FA_NOTIFICATION_TOPIC,
        BOOKETY_AUTH_SIGNIN_NOTIFICATION_TOPIC,
        BOOKETY_AUTH_RESET_PASSWORD_TOKEN_NOTIFICATION_TOPIC,
      ].includes(topic)
        ? NOTIFICATION_EXCHANGE
        : AUTH_EXCHANGE;
      // declared exchange, queue, and also bind queue to exchange using the right routing key
      await this.channel.publish(
        exchange,
        topic,
        Buffer.from(JSON.stringify(message))
      );
      logger.info(
        `Sent message using the routing key: ${topic} to the exchange: ${exchange}`,
        {
          message,
        }
      );
    } catch (error: any) {
      logger.error(`channel connection error`, {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async disconnectProduct() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
    } catch (error) {
      logger.error("Failed to disconnect Auth Channel", { error });
    }
  }
}
