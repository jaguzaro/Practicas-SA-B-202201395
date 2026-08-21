from typing import Protocol

from app.approvals.models import Approval, NewApprovalStep


class ApprovalRepository(Protocol):
    def find_by_batch(self, batch_id: int) -> Approval | None: ...

    def create(self, batch_id: int, status: str, step: NewApprovalStep) -> Approval: ...

    def add_step(self, approval_id: int, status: str, step: NewApprovalStep) -> Approval: ...
