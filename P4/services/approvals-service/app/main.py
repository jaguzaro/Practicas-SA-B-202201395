from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from strawberry.fastapi import GraphQLRouter

from app.approvals.graphql_schema import schema
from app.approvals.postgres_repository import PostgresApprovalRepository
from app.approvals.service import ApprovalService
from app.auth.authorization_client import AuthorizationUnavailableError, HttpAuthorizationClient
from app.audit_client import HttpAuditClient
from app.notifications_client import HttpNotificationsClient
from app.auth.token_verifier import InvalidTokenError, JwtTokenVerifier
from app.config import settings
from app.db import bootstrap_database, pool

token_verifier = JwtTokenVerifier(settings.jwt_secret)
authorization_client = HttpAuthorizationClient(
    settings.authz_service_url,
    settings.authz_max_retries,
    settings.authz_backoff_ms,
)
service = ApprovalService(
    PostgresApprovalRepository(pool),
    HttpAuditClient(settings.audit_service_url, "approvals-service"),
    HttpNotificationsClient(settings.notifications_service_url),
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    pool.open()
    bootstrap_database()
    yield
    pool.close()


def extract_token(request: Request) -> str:
    header = request.headers.get("authorization", "")

    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No hay sesion activa")

    return header.removeprefix("Bearer ")


async def build_context(request: Request) -> dict:
    if request.method == "GET":
        return {"service": service, "auth": None, "token": None, "correlation_id": request.headers.get("x-correlation-id", str(uuid4()))}

    token = extract_token(request)

    try:
        verified = token_verifier.verify(token)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Sesion invalida o expirada")

    try:
        decision = authorization_client.authorize(token, "approvals")
    except AuthorizationUnavailableError:
        raise HTTPException(status_code=503, detail="No se pudo validar la autorizacion, intente mas tarde")

    if not decision.allowed:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    return {
        "service": service,
        "auth": verified,
        "token": token,
        "correlation_id": request.headers.get("x-correlation-id", str(uuid4())),
    }


app = FastAPI(lifespan=lifespan)
app.include_router(GraphQLRouter(schema, context_getter=build_context), prefix="/approvals/graphql")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "approvals-service"}
