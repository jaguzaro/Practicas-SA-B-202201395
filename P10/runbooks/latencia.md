# Runbook de la alerta de latencia

Se dispara cuando la proporcion de peticiones al servicio de transacciones atendidas bajo medio segundo cae lo suficiente para agotar el presupuesto mensual antes de tiempo.

## Que significa

El indicador es la proporcion de peticiones a transactions-service cuya duracion fue menor o igual a medio segundo. El objetivo es 99 por ciento sobre treinta dias. El umbral de medio segundo es el limite a partir del cual el registro de un lote deja de sentirse inmediato para quien lo esta usando.

## Pasos de atencion

Confirmar la degradacion y ubicarla en el tiempo. En Grafana, tablero Operacion de la plataforma, panel Latencia del registro de lotes.

    histogram_quantile(0.95, sum by (le) (rate(http_server_duration_seconds_bucket{namespace="sa-p8",servicio="transactions-service"}[5m])))

Distinguir si la lentitud es del servicio o de aquello a lo que llama. Buscar en Tempo una traza lenta de transactions-service y observar la duracion de cada salto. El registro de un lote llama a authz-service para autorizar y a audit-service para dejar constancia, de modo que la traza dice si el tiempo se va en el propio servicio, en una dependencia o en la base de datos.

Saltar de la traza a sus registros para leer el detalle de la peticion concreta.

    {namespace="sa-p8", servicio="transactions-service"} | json | duration_ms > 500

Revisar saturacion antes de concluir. Si los contenedores estan limitados por CPU, la latencia es consecuencia y no causa.

    sum by (pod) (rate(container_cpu_cfs_throttled_seconds_total{namespace="sa-p8"}[5m]))

## Acciones posibles

Si la lentitud coincide con un despliegue, el analisis del canary deberia haberlo revertido; verificar el Rollout y su ultimo AnalysisRun.

Si la causa es saturacion, el autoescalado deberia estar creando replicas; comprobar que no choca contra el maximo ni contra la cuota del namespace.

    kubectl -n sa-p8 get hpa
    kubectl -n sa-p8 describe resourcequota

Si la causa es la base de datos, revisar conexiones activas y consultas lentas antes de escalar los servicios, porque mas replicas sobre una base saturada empeoran el problema.

## Cuando cerrar

Cuando el percentil 95 vuelva bajo medio segundo y la velocidad de consumo baje del umbral.
