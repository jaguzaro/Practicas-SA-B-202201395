from abc import ABC, abstractmethod
from typing import Optional

from database import get_connection


class LectorSolicitudes(ABC):
    """Interfaz de solo lectura (ISP)."""

    @abstractmethod
    def listar(self) -> list[dict]: ...


class EscritorSolicitudes(ABC):
    """Interfaz de escritura (ISP): separada de la de lectura."""

    @abstractmethod
    def crear(self, datos: dict) -> dict: ...

    @abstractmethod
    def actualizar(self, solicitud_id: int, datos: dict) -> Optional[dict]: ...

    @abstractmethod
    def actualizar_estado(self, solicitud_id: int, estado: str) -> Optional[dict]: ...

    @abstractmethod
    def eliminar(self, solicitud_id: int) -> bool: ...


class SolicitudRepository(LectorSolicitudes, EscritorSolicitudes, ABC):
    """Contrato de persistencia (OCP + DIP): el service depende de esto, no de psycopg2."""


class PostgresSolicitudRepository(SolicitudRepository):
    """Implementación concreta con psycopg2 (LSP: sustituye al contrato sin romper al service)."""

    def listar(self) -> list[dict]:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM solicitudes_operativas ORDER BY id")
                return cur.fetchall()
        finally:
            conn.close()

    def crear(self, datos: dict) -> dict:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO solicitudes_operativas
                        (titulo, area_solicitante, prioridad, costo_estimado, estado)
                    VALUES (%(titulo)s, %(area_solicitante)s, %(prioridad)s,
                            %(costo_estimado)s, %(estado)s)
                    RETURNING *
                    """,
                    datos,
                )
                nueva = cur.fetchone()
                conn.commit()
                return nueva
        finally:
            conn.close()

    def actualizar(self, solicitud_id: int, datos: dict) -> Optional[dict]:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE solicitudes_operativas
                    SET titulo = %(titulo)s,
                        area_solicitante = %(area_solicitante)s,
                        prioridad = %(prioridad)s,
                        costo_estimado = %(costo_estimado)s,
                        estado = %(estado)s
                    WHERE id = %(id)s
                    RETURNING *
                    """,
                    {**datos, "id": solicitud_id},
                )
                actualizada = cur.fetchone()
                conn.commit()
                return actualizada
        finally:
            conn.close()

    def actualizar_estado(self, solicitud_id: int, estado: str) -> Optional[dict]:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE solicitudes_operativas
                    SET estado = %s
                    WHERE id = %s
                    RETURNING *
                    """,
                    (estado, solicitud_id),
                )
                actualizada = cur.fetchone()
                conn.commit()
                return actualizada
        finally:
            conn.close()

    def eliminar(self, solicitud_id: int) -> bool:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM solicitudes_operativas WHERE id = %s RETURNING id",
                    (solicitud_id,),
                )
                eliminada = cur.fetchone()
                conn.commit()
                return eliminada is not None
        finally:
            conn.close()
