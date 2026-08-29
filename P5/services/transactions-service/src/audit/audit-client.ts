export interface AuditEvent {
  correlationId: string;
  action: string;
  actor: string;
  batchId: number | null;
  detail: string | null;
}

export interface AuditClient {
  record(event: AuditEvent): Promise<void>;
}
