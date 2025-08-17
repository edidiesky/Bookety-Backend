𝗔𝘀𝘆𝗻𝗰. 𝗠𝗲𝘀𝘀𝗮𝗴𝗶𝗻𝗴 𝗠𝗼𝗱𝗲𝗹 𝘂𝘀𝗶𝗻𝗴 𝗥𝗮𝗯𝗯𝗶𝘁𝗠𝗤 (𝟮𝗙𝗔 𝗨𝘀𝗲 𝗖𝗮𝘀𝗲)

Decoupling services in a microservice is one of the key qualities of  microservices, and RabbitMQ has been my go-to for achieving it. I have worked on several features demanding inter-service interraction. One of these features includes 2FA authentication. In this post, I’ll walk you through my journey implementing 2FA token delivery, the hurdles I’ve faced with RabbitMQ exchange declarations, and how this approach decouples my Auth and Notification services.



𝟮𝗙𝗔 𝗨𝘀𝗲 𝗖𝗮𝘀𝗲 𝘄𝗶𝘁𝗵 𝗥𝗮𝗯𝗯𝗶𝘁𝗠𝗤

In my `loginHandler`, after validating a user’s email and password, I do generate a 2FA token and send it via RabbitMQ to the user’s email. Here’s the flow:  

- A secure token is created and packaged into a message.  

- The `AuthProducer` publishes it to the `NOTIFICATION_EXCHANGE` using the `BOOKETY_AUTH_2FA_NOTIFICATION_TOPIC` routing key.  

- A decoupled Notification service consumes this, delivering the token via email. I ahve attached the code snippet for the entities (LoginHandler, AuthProducer)

This real-time, reliable delivery is powered by RabbitMQ’s AMQP model, perfect for security-sensitive workflows.  


𝗨𝗻𝗱𝗲𝗿𝘀𝘁𝗮𝗻𝗱𝗶𝗻𝗴 𝗥𝗮𝗯𝗯𝗶𝘁𝗠𝗤 𝗖𝗼𝗺𝗽𝗼𝗻𝗲𝗻𝘁𝘀

- Connections: It is more of a bi-directional interaction btw. the specified microservice and RabbitMQ server over a TCP network. In each Services, it is fine they do have a separate TCP connection to RabbitMQ. The idea is to acheieve fault tolerance, and allowing each of the services to scale independently based on workload demand.

- Channel: A channel is more of a single virtual connection within a single conenction. In a Microservice, it is also fine to configure it to have multiple channels based on workload idea. Like, in my Auth service, I have 2 channels, one for Producing messages (events) and the other for consuming events. 

- Exchanges: Exchanges is a RabbitMQ routing entity that can dynamically routes Producers messages to the right queue for cosumers to subscribe to. One key steps when starting up a RabbitMQ connection is to always declare your Service Exchange on RabbitMQ server. If no exchange is been declared, no message will be delivered. Also you also have to bind your Queue to RabbitMQ Exchange with the right business Routing keys. If this is not carried out messages will definitely be lost.

- Routing Keys: They are like identifiers that Producers attachs to messages and they allows Exchanges to determine the recipient Queue. For example in mY Auth service, I have serveral routing keys like BOOKETY_AUTH_2FA_NOTIFICATION_TOPIC = "" which route 2FA messages to the right queue on the Notification Exchange.


- Queues: They are simply Buffers that hold messages until the Notification service processes them, ensuring no loss during spikes


𝗖𝗵𝗮𝗹𝗹𝗲𝗻𝗴𝗲𝘀 𝘄𝗶𝘁𝗵 𝗘𝘅𝗰𝗵𝗮𝗻𝗴𝗲 𝗗𝗲𝗰𝗹𝗮𝗿𝗮𝘁𝗶𝗼𝗻

One key challenge I am aware of is that you have to explicitly define your exchange type when working inter-service in a Microservice. For instance, if an exchange isn’t explicitly declared in the producer, messages default to the `AUTH_EXCHANGE` rather than the intended `NOTIFICATION_EXCHANGE`, a critical issue for 2FA tokens that could misroute to the wrong service.


𝗗𝗲𝗰𝗼𝘂𝗽𝗹𝗶𝗻𝗴 𝗡𝗼𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻 𝗳𝗿𝗼𝗺 𝗔𝘂𝘁𝗵 𝗦𝗲𝗿𝘃𝗶𝗰𝗲

RabbitMQ’s async model shines here. The Auth service (handling login) publishes 2FA tokens without knowing how or when they’re delivered. The Notification service, running independently, consumes these messages and sends emails. This decoupling:  

- Improves Scalability: Auth can scale user validation separately from email delivery.  

- Enhances Resilience: If the Notification service fails, Auth continues processing logins, queuing messages for later.  

In this code declaration I left out the DLQ configuration which is a key step in handling failed messages. I’m always for open for more directions.

I’d love to hear your thoughts on RabbitMQ for 2FA or decoupling strategies!

#Microservices #RabbitMQ

