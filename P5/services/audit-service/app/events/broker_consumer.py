import json
import logging
import threading
import time

import pika

from app.config import settings
from app.events.models import NewAuditEvent
from app.events.service import AuditService

logger = logging.getLogger("audit.consumer")


class BrokerConsumer:
    def __init__(self, service: AuditService, broker_url: str, queue: str) -> None:
        self._service = service
        self._broker_url = broker_url
        self._queue = queue
        self._thread: threading.Thread | None = None
        self._stopping = threading.Event()

    def start(self) -> None:
        if not self._broker_url:
            logger.info("BROKER_URL no definido, el consumidor no se inicia")
            return
        self._thread = threading.Thread(target=self._run, name="audit-consumer", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stopping.set()

    def _run(self) -> None:
        while not self._stopping.is_set():
            try:
                self._consume()
            except Exception:
                logger.exception("Conexion con el broker perdida, reintentando en 5 segundos")
                time.sleep(5)

    def _consume(self) -> None:
        parameters = pika.URLParameters(self._broker_url)
        parameters.heartbeat = 30
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        channel.queue_declare(queue=self._queue, durable=True)
        channel.basic_qos(prefetch_count=settings.broker_prefetch)
        channel.basic_consume(queue=self._queue, on_message_callback=self._handle, auto_ack=False)
        logger.info("Consumidor escuchando la cola %s", self._queue)
        channel.start_consuming()

    def _handle(self, channel, method, _properties, body: bytes) -> None:
        try:
            payload = json.loads(body)
            self._service.record(
                NewAuditEvent(
                    correlation_id=payload["correlation_id"],
                    service=payload["service"],
                    action=payload["action"],
                    actor=payload.get("actor"),
                    batch_id=payload.get("batch_id"),
                    detail=payload.get("detail"),
                )
            )
        except Exception:
            logger.exception("No se pudo procesar el evento, se devuelve a la cola")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            return

        channel.basic_ack(delivery_tag=method.delivery_tag)
