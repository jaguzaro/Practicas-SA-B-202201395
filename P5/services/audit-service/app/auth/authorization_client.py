import time
from dataclasses import dataclass
from typing import Protocol

import httpx

REQUEST_TIMEOUT_SECONDS = 2.0


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    role: str | None = None
    reason: str | None = None


class AuthorizationUnavailableError(Exception):
    pass


class AuthorizationClient(Protocol):
    def authorize(self, token: str, route: str) -> AuthorizationDecision: ...


class HttpAuthorizationClient:
    def __init__(self, base_url: str, max_retries: int, backoff_ms: int) -> None:
        self._base_url = base_url
        self._max_retries = max_retries
        self._backoff_ms = backoff_ms

    def authorize(self, token: str, route: str) -> AuthorizationDecision:
        last_error: Exception | None = None

        for attempt in range(self._max_retries + 1):
            try:
                response = httpx.post(
                    f"{self._base_url}/authorize",
                    json={"token": token, "route": route},
                    timeout=REQUEST_TIMEOUT_SECONDS,
                )
                response.raise_for_status()
                body = response.json()
                return AuthorizationDecision(
                    allowed=bool(body.get("allowed")),
                    role=body.get("role"),
                    reason=body.get("reason"),
                )
            except Exception as error:
                last_error = error
                if attempt < self._max_retries:
                    time.sleep(self._backoff_ms * (2**attempt) / 1000)

        raise AuthorizationUnavailableError("No se pudo consultar authz-service") from last_error
