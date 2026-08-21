from app.events.models import AuditEvent, NewAuditEvent
from app.events.repository import AuditEventRepository


class AuditService:
    def __init__(self, repository: AuditEventRepository) -> None:
        self._repository = repository

    def record(self, event: NewAuditEvent) -> AuditEvent:
        return self._repository.record(event)

    def search(
        self,
        correlation_id: str | None = None,
        service: str | None = None,
        batch_id: int | None = None,
    ) -> list[AuditEvent]:
        return self._repository.search(correlation_id, service, batch_id)
