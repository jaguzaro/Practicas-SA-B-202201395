from app.approvals.models import (
    AUTHORIZED,
    PENDING_AUTHORIZATION,
    PENDING_REVIEW,
    REJECTED,
    Approval,
    NewApprovalStep,
)
from app.approvals.repository import ApprovalRepository
from app.audit_client import AuditClient
from app.notifications_client import NotificationsClient

REQUIRED_ROLE_BY_ACTION = {
    "submit": ("maker", "admin"),
    "review": ("checker", "admin"),
    "authorize": ("authorizer", "admin"),
    "reject": ("checker", "authorizer", "admin"),
}

REQUIRED_STATUS_BY_ACTION = {
    "review": PENDING_REVIEW,
    "authorize": PENDING_AUTHORIZATION,
    "reject": (PENDING_REVIEW, PENDING_AUTHORIZATION),
}

NEXT_STATUS_BY_ACTION = {
    "submit": PENDING_REVIEW,
    "review": PENDING_AUTHORIZATION,
    "authorize": AUTHORIZED,
    "reject": REJECTED,
}


class ApprovalError(Exception):
    pass


class ApprovalService:
    def __init__(
        self,
        repository: ApprovalRepository,
        audit_client: AuditClient,
        notifications_client: NotificationsClient,
    ) -> None:
        self._repository = repository
        self._audit_client = audit_client
        self._notifications_client = notifications_client

    def find_by_batch(self, batch_id: int) -> Approval | None:
        return self._repository.find_by_batch(batch_id)

    def register_step(
        self,
        batch_id: int,
        action: str,
        actor: str,
        actor_role: str,
        comment: str | None,
        correlation_id: str,
        token: str,
    ) -> Approval:
        if action not in NEXT_STATUS_BY_ACTION:
            raise ApprovalError("La accion debe ser submit, review, authorize o reject")

        if actor_role not in REQUIRED_ROLE_BY_ACTION[action]:
            raise ApprovalError(f"El rol {actor_role} no puede ejecutar la accion {action}")

        step = NewApprovalStep(action=action, actor=actor, actor_role=actor_role, comment=comment)
        approval = self._repository.find_by_batch(batch_id)

        if action == "submit":
            if approval is not None:
                raise ApprovalError("El lote ya fue sometido a aprobacion")
            created = self._repository.create(batch_id, PENDING_REVIEW, step)
            self._record(correlation_id, action, actor, batch_id, created.status)
            return created

        if approval is None:
            raise ApprovalError("El lote no ha sido sometido a aprobacion")

        expected = REQUIRED_STATUS_BY_ACTION[action]
        allowed = expected if isinstance(expected, tuple) else (expected,)

        if approval.status not in allowed:
            raise ApprovalError(f"La accion {action} no aplica sobre un lote en estado {approval.status}")

        updated = self._repository.add_step(approval.id, NEXT_STATUS_BY_ACTION[action], step)
        self._record(correlation_id, action, actor, batch_id, updated.status)

        if updated.status == AUTHORIZED:
            self._notifications_client.notify_batch(batch_id, token, correlation_id)

        return updated

    def _record(self, correlation_id: str, action: str, actor: str, batch_id: int, status: str) -> None:
        self._audit_client.record(
            correlation_id=correlation_id,
            action=f"approval_{action}",
            actor=actor,
            batch_id=batch_id,
            detail=f"el lote quedo en estado {status}",
        )
