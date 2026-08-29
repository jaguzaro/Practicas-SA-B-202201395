from datetime import datetime

import strawberry
from strawberry.types import Info

from app.events.models import AuditEvent as AuditEventModel
from app.events.service import AuditService


@strawberry.type
class AuditEvent:
    id: int
    correlation_id: str
    service: str
    action: str
    actor: str | None
    batch_id: int | None
    detail: str | None
    created_at: datetime


def to_graphql(event: AuditEventModel) -> AuditEvent:
    return AuditEvent(
        id=event.id,
        correlation_id=event.correlation_id,
        service=event.service,
        action=event.action,
        actor=event.actor,
        batch_id=event.batch_id,
        detail=event.detail,
        created_at=event.created_at,
    )


def service_from(info: Info) -> AuditService:
    return info.context["service"]


@strawberry.type
class Query:
    @strawberry.field
    def events(
        self,
        info: Info,
        correlation_id: str | None = None,
        service: str | None = None,
        batch_id: int | None = None,
    ) -> list[AuditEvent]:
        found = service_from(info).search(correlation_id=correlation_id, service=service, batch_id=batch_id)
        return [to_graphql(event) for event in found]


schema = strawberry.Schema(query=Query)
