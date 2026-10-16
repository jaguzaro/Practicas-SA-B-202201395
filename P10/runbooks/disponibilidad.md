# Runbook de la alerta de disponibilidad

Se dispara cuando la plataforma devuelve respuestas de servidor a un ritmo que agotaria el presupuesto mensual de error antes de que termine la ventana. La version critica exige atencion inmediata porque al ritmo medido el presupuesto se agota en dos dias. La version de aviso puede esperar al siguiente dia habil.

## Que significa

El indicador es la proporcion de peticiones del namespace sa-p8 que no terminan en un codigo de familia 5xx. El objetivo es 99.5 por ciento sobre treinta dias, de modo que el presupuesto admite medio por ciento de peticiones fallidas al mes. La alerta no mira un umbral instantaneo sino la velocidad a la que ese presupuesto se consume.

## Pasos de atencion

Confirmar que la alerta refleja trafico real y no un pico de una sola replica. En Grafana, tablero Operacion de la plataforma, panel Errores por servicio.

    sum by (servicio) (rate(http_server_requests_total{namespace="sa-p8",familia="5xx"}[5m]))

Identificar que servicio concentra los errores. Si es uno solo, continuar por el; si son varios, sospechar de una dependencia compartida, que en esta plataforma es la base de datos o el broker.

Localizar una traza fallida del servicio senalado. En Grafana, fuente Tempo, buscar por nombre de servicio con estado de error. La traza muestra que operacion fallo y cuanto tardo cada salto.

Saltar de la traza a sus registros con el enlace de traza a registros, que filtra Loki por el identificador. La consulta equivalente es

    {namespace="sa-p8", servicio="SERVICIO"} | json | trace_id = "IDENTIFICADOR"

Leer el campo msg y el resto de campos del registro de nivel error. Ahi esta la causa concreta.

## Acciones posibles

Si el error llego con un despliegue reciente, revisar si hay un Rollout en progreso y dejar que el analisis por metricas lo revierta, o abortarlo a mano.

    kubectl argo rollouts get rollout SERVICIO -n sa-p8
    kubectl argo rollouts abort SERVICIO -n sa-p8

Si el error viene de la base de datos o del broker, revisar su disponibilidad antes de tocar los servicios.

    kubectl -n sa-p8 get pods -l app.kubernetes.io/name=postgresql
    kubectl -n sa-p8 get pods -l app.kubernetes.io/name=rabbitmq

Si el error es de una dependencia externa al cluster, la accion es comunicar y esperar, no reiniciar.

## Cuando cerrar

La alerta se resuelve sola cuando la velocidad de consumo baja del umbral. Antes de darla por cerrada, confirmar que el presupuesto consumido dejo de crecer.

    slo:disponibilidad:presupuesto_consumido
