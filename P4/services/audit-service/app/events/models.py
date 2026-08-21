from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class NewAuditEvent:
    correlation_id: str
    service: str
    action: str
    actor: str | None
    batch_id: int | None
    detail: str | None


@dataclass(frozen=True)
class AuditEvent:
    id: int
    correlation_id: str
    service: str
    action: str
    actor: str | None
    batch_id: int | None
    detail: str | None
    created_at: datetime
