from typing import Protocol

import httpx

REQUEST_TIMEOUT_SECONDS = 5.0


class NotificationsClient(Protocol):
    def notify_batch(self, batch_id: int, token: str, correlation_id: str) -> None: ...


class HttpNotificationsClient:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url

    def notify_batch(self, batch_id: int, token: str, correlation_id: str) -> None:
        try:
            httpx.post(
                f"{self._base_url}/notifications/batches/{batch_id}",
                headers={"Authorization": f"Bearer {token}", "x-correlation-id": correlation_id},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except Exception as error:
            print(f"No se pudo solicitar el envio de notificaciones: {error}")
