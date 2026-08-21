from typing import Protocol

from app.events.models import AuditEvent, NewAuditEvent


class AuditEventRepository(Protocol):
    def record(self, event: NewAuditEvent) -> AuditEvent: ...

    def search(self, correlation_id: str | None, service: str | None, batch_id: int | None) -> list[AuditEvent]: ...
