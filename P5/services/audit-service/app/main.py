from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from strawberry.fastapi import GraphQLRouter

from app.auth.authorization_client import AuthorizationUnavailableError, HttpAuthorizationClient
from app.auth.token_verifier import InvalidTokenError, JwtTokenVerifier
from app.config import settings
from app.db import bootstrap_database, pool
from app.events.graphql_schema import schema
from app.events.models import NewAuditEvent
from app.events.postgres_repository import PostgresAuditEventRepository
from app.events.broker_consumer import BrokerConsumer
from app.events.service import AuditService

token_verifier = JwtTokenVerifier(settings.jwt_secret)
authorization_client = HttpAuthorizationClient(
    settings.authz_service_url,
    settings.authz_max_retries,
    settings.authz_backoff_ms,
)
service = AuditService(PostgresAuditEventRepository(pool))


consumer = BrokerConsumer(service, settings.broker_url, settings.audit_queue)
summary_consumer = BrokerConsumer(service, settings.broker_url, settings.summary_queue)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    pool.open()
    bootstrap_database()
    consumer.start()
    summary_consumer.start()
    yield
    consumer.stop()
    summary_consumer.stop()
    pool.close()


class AuditEventRequest(BaseModel):
    correlation_id: str
    service: str
    action: str
    actor: str | None = None
    batch_id: int | None = None
    detail: str | None = None


async def build_context(request: Request) -> dict:
    if request.method == "GET":
        return {"service": service}

    header = request.headers.get("authorization", "")

    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No hay sesion activa")

    token = header.removeprefix("Bearer ")

    try:
        token_verifier.verify(token)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Sesion invalida o expirada")

    try:
        decision = authorization_client.authorize(token, "audit")
    except AuthorizationUnavailableError:
        raise HTTPException(status_code=503, detail="No se pudo validar la autorizacion, intente mas tarde")

    if not decision.allowed:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    return {"service": service}


app = FastAPI(lifespan=lifespan)
app.include_router(GraphQLRouter(schema, context_getter=build_context), prefix="/audit/graphql")


@app.post("/audit/events", status_code=201)
def record_event(payload: AuditEventRequest) -> dict:
    event = service.record(
        NewAuditEvent(
            correlation_id=payload.correlation_id,
            service=payload.service,
            action=payload.action,
            actor=payload.actor,
            batch_id=payload.batch_id,
            detail=payload.detail,
        )
    )
    return {"id": event.id}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "audit-service"}
