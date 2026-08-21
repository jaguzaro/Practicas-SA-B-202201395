from dataclasses import dataclass
from datetime import datetime

PENDING_REVIEW = "pending_review"
PENDING_AUTHORIZATION = "pending_authorization"
AUTHORIZED = "authorized"
REJECTED = "rejected"


@dataclass(frozen=True)
class NewApprovalStep:
    action: str
    actor: str
    actor_role: str
    comment: str | None


@dataclass(frozen=True)
class ApprovalStep:
    action: str
    actor: str
    actor_role: str
    comment: str | None
    created_at: datetime


@dataclass(frozen=True)
class Approval:
    id: int
    batch_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    steps: tuple[ApprovalStep, ...]
