from datetime import datetime

import strawberry
from strawberry.types import Info

from app.approvals.models import Approval as ApprovalModel
from app.approvals.service import ApprovalError, ApprovalService


@strawberry.type
class ApprovalStep:
    action: str
    actor: str
    actor_role: str
    comment: str | None
    created_at: datetime


@strawberry.type
class Approval:
    id: int
    batch_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    steps: list[ApprovalStep]


def to_graphql(approval: ApprovalModel) -> Approval:
    return Approval(
        id=approval.id,
        batch_id=approval.batch_id,
        status=approval.status,
        created_at=approval.created_at,
        updated_at=approval.updated_at,
        steps=[
            ApprovalStep(
                action=step.action,
                actor=step.actor,
                actor_role=step.actor_role,
                comment=step.comment,
                created_at=step.created_at,
            )
            for step in approval.steps
        ],
    )


def service_from(info: Info) -> ApprovalService:
    return info.context["service"]


@strawberry.type
class Query:
    @strawberry.field
    def approval(self, info: Info, batch_id: int) -> Approval | None:
        approval = service_from(info).find_by_batch(batch_id)
        return to_graphql(approval) if approval else None


@strawberry.type
class Mutation:
    @strawberry.mutation
    def register_step(self, info: Info, batch_id: int, action: str, comment: str | None = None) -> Approval:
        auth = info.context["auth"]
        correlation_id = info.context["correlation_id"]

        try:
            approval = service_from(info).register_step(
                batch_id=batch_id,
                action=action,
                actor=auth.subject,
                actor_role=auth.role,
                comment=comment,
                correlation_id=correlation_id,
                token=info.context["token"],
            )
        except ApprovalError as error:
            raise ValueError(str(error)) from error

        return to_graphql(approval)


schema = strawberry.Schema(query=Query, mutation=Mutation)
