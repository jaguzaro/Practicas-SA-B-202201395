from typing import Protocol

import httpx

REQUEST_TIMEOUT_SECONDS = 2.0


class AuditClient(Protocol):
    def record(self, correlation_id: str, action: str, actor: str, batch_id: int, detail: str | None) -> None: ...


class HttpAuditClient:
    def __init__(self, base_url: str, service_name: str) -> None:
        self._base_url = base_url
        self._service_name = service_name

    def record(self, correlation_id: str, action: str, actor: str, batch_id: int, detail: str | None) -> None:
        try:
            httpx.post(
                f"{self._base_url}/audit/events",
                json={
                    "correlation_id": correlation_id,
                    "service": self._service_name,
                    "action": action,
                    "actor": actor,
                    "batch_id": batch_id,
                    "detail": detail,
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except Exception as error:
            print(f"No se pudo registrar el evento de auditoria: {error}")
