import amqplib from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import type { AuditClient, AuditEvent } from "./audit-client.js";

export class BrokerAuditClient implements AuditClient {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(
    private readonly brokerUrl: string,
    private readonly queue: string,
    private readonly serviceName: string,
  ) {}

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    const connection = await amqplib.connect(this.brokerUrl);
    connection.on("close", () => {
      this.connection = null;
      this.channel = null;
    });
    connection.on("error", () => {
      this.connection = null;
      this.channel = null;
    });

    const channel = await connection.createChannel();
    await channel.assertQueue(this.queue, { durable: true });

    this.connection = connection;
    this.channel = channel;
    return channel;
  }

  async record(event: AuditEvent): Promise<void> {
    try {
      const channel = await this.getChannel();
      const message = {
        correlation_id: event.correlationId,
        service: this.serviceName,
        action: event.action,
        actor: event.actor,
        batch_id: event.batchId,
        detail: event.detail,
      };

      channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: "application/json",
      });
    } catch (error) {
      console.error("No se pudo publicar el evento de auditoria en el broker", error);
    }
  }
}
