import json
import os
import sys
from datetime import datetime, timedelta, timezone

import pika
import psycopg

GMT_MENOS_6 = timezone(timedelta(hours=-6))


def main() -> int:
    database_url = os.environ["DATABASE_URL"]
    broker_url = os.environ["BROKER_URL"]
    queue = os.environ.get("SUMMARY_QUEUE", "audit.summaries")
    carne = os.environ["CARNE"]

    with psycopg.connect(database_url) as connection:
        filas = connection.execute(
            """
            SELECT date_trunc('hour', ejecutado_en) AS hora, count(*) AS ejecuciones
            FROM ejecuciones_cronjob
            GROUP BY hora
            ORDER BY hora DESC
            LIMIT 24
            """
        ).fetchall()

    resumen = [
        {"hora": hora.astimezone(GMT_MENOS_6).isoformat(), "ejecuciones": ejecuciones}
        for hora, ejecuciones in filas
    ]

    mensaje = {
        "correlation_id": f"resumen-{datetime.now(GMT_MENOS_6).strftime('%Y%m%d%H%M%S')}",
        "service": "cronjob-resumen",
        "action": "resumen_ejecuciones_por_hora",
        "actor": carne,
        "batch_id": None,
        "detail": json.dumps(resumen, ensure_ascii=False),
    }

    parameters = pika.URLParameters(broker_url)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.queue_declare(queue=queue, durable=True)
    channel.basic_publish(
        exchange="",
        routing_key=queue,
        body=json.dumps(mensaje).encode("utf-8"),
        properties=pika.BasicProperties(delivery_mode=2, content_type="application/json"),
    )
    connection.close()

    print(f"Resumen publicado en la cola {queue}: {len(resumen)} horas agregadas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
