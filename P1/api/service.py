from typing import Optional

from repository import SolicitudRepository
from schemas import SolicitudCreate, SolicitudUpdate


class SolicitudService:
    """Lógica de negocio (SRP): no sabe cómo se persisten los datos, solo usa el contrato (DIP)."""

    def __init__(self, repositorio: SolicitudRepository):
        self._repositorio = repositorio

    def listar_solicitudes(self) -> list[dict]:
        return self._repositorio.listar()

    def registrar_solicitud(self, solicitud: SolicitudCreate) -> dict:
        return self._repositorio.crear(solicitud.model_dump())

    def actualizar_solicitud(self, solicitud_id: int, solicitud: SolicitudUpdate) -> Optional[dict]:
        return self._repositorio.actualizar(solicitud_id, solicitud.model_dump())

    def actualizar_estado(self, solicitud_id: int, estado: str) -> Optional[dict]:
        return self._repositorio.actualizar_estado(solicitud_id, estado)

    def eliminar_solicitud(self, solicitud_id: int) -> bool:
        return self._repositorio.eliminar(solicitud_id)
