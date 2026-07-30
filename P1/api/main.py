from fastapi import FastAPI, HTTPException

from database import get_connection
from schemas import EstadoUpdate, SolicitudCreate, SolicitudUpdate

app = FastAPI(title="API Solicitudes Operativas")


@app.get("/solicitudes")
def obtener_solicitudes():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM solicitudes_operativas ORDER BY id")
            return cur.fetchall()
    finally:
        conn.close()


@app.post("/solicitudes", status_code=201)
def registrar_solicitud(solicitud: SolicitudCreate):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO solicitudes_operativas
                    (titulo, area_solicitante, prioridad, costo_estimado, estado)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    solicitud.titulo,
                    solicitud.area_solicitante,
                    solicitud.prioridad,
                    solicitud.costo_estimado,
                    solicitud.estado,
                ),
            )
            nueva = cur.fetchone()
            conn.commit()
            return nueva
    finally:
        conn.close()


@app.put("/solicitudes/{solicitud_id}")
def actualizar_solicitud(solicitud_id: int, solicitud: SolicitudUpdate):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE solicitudes_operativas
                SET titulo = %s,
                    area_solicitante = %s,
                    prioridad = %s,
                    costo_estimado = %s,
                    estado = %s
                WHERE id = %s
                RETURNING *
                """,
                (
                    solicitud.titulo,
                    solicitud.area_solicitante,
                    solicitud.prioridad,
                    solicitud.costo_estimado,
                    solicitud.estado,
                    solicitud_id,
                ),
            )
            actualizada = cur.fetchone()
            if actualizada is None:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")
            conn.commit()
            return actualizada
    finally:
        conn.close()


@app.patch("/solicitudes/{solicitud_id}/estado")
def actualizar_estado_solicitud(solicitud_id: int, cambio: EstadoUpdate):
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
                (cambio.estado, solicitud_id),
            )
            actualizada = cur.fetchone()
            if actualizada is None:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")
            conn.commit()
            return actualizada
    finally:
        conn.close()


@app.delete("/solicitudes/{solicitud_id}", status_code=204)
def eliminar_solicitud(solicitud_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM solicitudes_operativas WHERE id = %s RETURNING id",
                (solicitud_id,),
            )
            eliminada = cur.fetchone()
            if eliminada is None:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada")
            conn.commit()
    finally:
        conn.close()
