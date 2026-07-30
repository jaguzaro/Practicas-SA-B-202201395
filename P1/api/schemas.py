from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

Estado = Literal["registrada", "en_proceso", "finalizada"]


class SolicitudCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=150)
    area_solicitante: str = Field(..., min_length=1, max_length=100)
    prioridad: int = Field(..., ge=1, le=5)
    costo_estimado: Decimal = Field(..., ge=0)
    estado: Estado = "registrada"


class SolicitudUpdate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=150)
    area_solicitante: str = Field(..., min_length=1, max_length=100)
    prioridad: int = Field(..., ge=1, le=5)
    costo_estimado: Decimal = Field(..., ge=0)
    estado: Estado


class EstadoUpdate(BaseModel):
    estado: Estado
