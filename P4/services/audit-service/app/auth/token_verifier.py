from dataclasses import dataclass
from typing import Protocol

import jwt

ROLES = ("admin", "maker", "checker", "authorizer", "auditor")


@dataclass(frozen=True)
class VerifiedToken:
    subject: str
    role: str


class InvalidTokenError(Exception):
    pass


class TokenVerifier(Protocol):
    def verify(self, token: str) -> VerifiedToken: ...


class JwtTokenVerifier:
    def __init__(self, secret: str) -> None:
        self._secret = secret

    def verify(self, token: str) -> VerifiedToken:
        try:
            payload = jwt.decode(token, self._secret, algorithms=["HS256"])
        except jwt.PyJWTError as error:
            raise InvalidTokenError("El token es invalido o expiro") from error

        subject = payload.get("sub")
        role = payload.get("role")

        if not isinstance(subject, str) or role not in ROLES:
            raise InvalidTokenError("El token no contiene un rol o identificador valido")

        return VerifiedToken(subject=subject, role=role)
