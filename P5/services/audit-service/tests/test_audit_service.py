from datetime import datetime, timezone

from app.events.models import AuditEvent, NewAuditEvent
from app.events.service import AuditService


class RepositorioEnMemoria:
    """Doble de prueba que guarda los eventos en una lista en lugar de una base de datos."""

    def __init__(self) -> None:
        self.eventos: list[AuditEvent] = []
        self._siguiente_id = 1

    def record(self, event: NewAuditEvent) -> AuditEvent:
        almacenado = AuditEvent(
            id=self._siguiente_id,
            correlation_id=event.correlation_id,
            service=event.service,
            action=event.action,
            actor=event.actor,
            batch_id=event.batch_id,
            detail=event.detail,
            created_at=datetime.now(timezone.utc),
        )
        self.eventos.append(almacenado)
        self._siguiente_id += 1
        return almacenado

    def search(
        self,
        correlation_id: str | None = None,
        service: str | None = None,
        batch_id: int | None = None,
    ) -> list[AuditEvent]:
        resultado = self.eventos
        if correlation_id is not None:
            resultado = [e for e in resultado if e.correlation_id == correlation_id]
        if service is not None:
            resultado = [e for e in resultado if e.service == service]
        if batch_id is not None:
            resultado = [e for e in resultado if e.batch_id == batch_id]
        return resultado


def nuevo_evento(**cambios) -> NewAuditEvent:
    base = {
        "correlation_id": "abc-123",
        "service": "transactions-service",
        "action": "batch_created",
        "actor": "202201395",
        "batch_id": 1,
        "detail": "1 de 1 transacciones validas",
    }
    base.update(cambios)
    return NewAuditEvent(**base)


def test_registra_un_evento_y_le_asigna_identificador():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)

    resultado = servicio.record(nuevo_evento())

    assert resultado.id == 1
    assert resultado.correlation_id == "abc-123"
    assert resultado.created_at is not None


def test_asigna_identificadores_consecutivos():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)

    primero = servicio.record(nuevo_evento(correlation_id="uno"))
    segundo = servicio.record(nuevo_evento(correlation_id="dos"))

    assert primero.id == 1
    assert segundo.id == 2


def test_conserva_los_campos_opcionales_vacios():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)

    resultado = servicio.record(nuevo_evento(actor=None, batch_id=None, detail=None))

    assert resultado.actor is None
    assert resultado.batch_id is None
    assert resultado.detail is None


def test_busca_sin_filtros_devuelve_todo():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)
    servicio.record(nuevo_evento(correlation_id="uno"))
    servicio.record(nuevo_evento(correlation_id="dos"))

    resultado = servicio.search()

    assert len(resultado) == 2


def test_busca_por_identificador_de_correlacion():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)
    servicio.record(nuevo_evento(correlation_id="uno"))
    servicio.record(nuevo_evento(correlation_id="dos"))

    resultado = servicio.search(correlation_id="dos")

    assert len(resultado) == 1
    assert resultado[0].correlation_id == "dos"


def test_busca_por_servicio():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)
    servicio.record(nuevo_evento(service="transactions-service"))
    servicio.record(nuevo_evento(service="cronjob-resumen"))

    resultado = servicio.search(service="cronjob-resumen")

    assert len(resultado) == 1
    assert resultado[0].service == "cronjob-resumen"


def test_busca_combinando_filtros():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)
    servicio.record(nuevo_evento(service="transactions-service", batch_id=1))
    servicio.record(nuevo_evento(service="transactions-service", batch_id=2))

    resultado = servicio.search(service="transactions-service", batch_id=2)

    assert len(resultado) == 1
    assert resultado[0].batch_id == 2


def test_busca_sin_coincidencias_devuelve_lista_vacia():
    repositorio = RepositorioEnMemoria()
    servicio = AuditService(repositorio)
    servicio.record(nuevo_evento())

    resultado = servicio.search(correlation_id="inexistente")

    assert resultado == []
