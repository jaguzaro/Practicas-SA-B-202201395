from fastapi import Depends, FastAPI, HTTPException

from repository import PostgresSolicitudRepository, SolicitudRepository
from schemas import EstadoUpdate, SolicitudCreate, SolicitudUpdate
from service import SolicitudService

app = FastAPI(title="API Solicitudes Operativas")


def get_repository() -> SolicitudRepository:
    return PostgresSolicitudRepository()


def get_service(repositorio: SolicitudRepository = Depends(get_repository)) -> SolicitudService:
    """Inyección de dependencias (DIP): las rutas reciben el servicio, no un repositorio concreto."""
    return SolicitudService(repositorio)


@app.get("/solicitudes")
def obtener_solicitudes(service: SolicitudService = Depends(get_service)):
    return service.listar_solicitudes()


@app.post("/solicitudes", status_code=201)
def registrar_solicitud(solicitud: SolicitudCreate, service: SolicitudService = Depends(get_service)):
    return service.registrar_solicitud(solicitud)


@app.put("/solicitudes/{solicitud_id}")
def actualizar_solicitud(
    solicitud_id: int,
    solicitud: SolicitudUpdate,
    service: SolicitudService = Depends(get_service),
):
    actualizada = service.actualizar_solicitud(solicitud_id, solicitud)
    if actualizada is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return actualizada


@app.patch("/solicitudes/{solicitud_id}/estado")
def actualizar_estado_solicitud(
    solicitud_id: int,
    cambio: EstadoUpdate,
    service: SolicitudService = Depends(get_service),
):
    actualizada = service.actualizar_estado(solicitud_id, cambio.estado)
    if actualizada is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return actualizada


@app.delete("/solicitudes/{solicitud_id}", status_code=204)
def eliminar_solicitud(solicitud_id: int, service: SolicitudService = Depends(get_service)):
    eliminada = service.eliminar_solicitud(solicitud_id)
    if not eliminada:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
