import { cabecerasDeContexto } from "../telemetria/http.js";
import type { AuditClient, AuditEvent } from "./audit-client.js";

const REQUEST_TIMEOUT_MS = 2000;

export class HttpAuditClient implements AuditClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceName: string,
  ) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/audit/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...cabecerasDeContexto() },
        body: JSON.stringify({
          correlation_id: event.correlationId,
          service: this.serviceName,
          action: event.action,
          actor: event.actor,
          batch_id: event.batchId,
          detail: event.detail,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      console.error("No se pudo registrar el evento de auditoria", error);
    }
  }
}
