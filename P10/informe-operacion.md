# Informe de operacion

Ejercicio ejecutado sobre la plataforma de microservicios desplegada en el namespace sa-p8.

## SLO declarados

El primero es de disponibilidad. El indicador es la proporcion de peticiones que no terminan en un codigo de familia cinco, medido sobre todas las peticiones que los tres servicios instrumentados atienden en produccion, y el objetivo es el 99.5 por ciento sobre una ventana de treinta dias.

El numero sale de dos consideraciones. La primera es lo que la arquitectura puede sostener, dos replicas por servicio sobre tres nodos, con una sola instancia de base de datos y una sola de broker, sin replicacion ni conmutacion automatica. Prometer tres nueves con esa forma seria prometer algo que la propia infraestructura no permite cumplir. La segunda es que medio por ciento de peticiones fallidas al mes deja margen para que un despliegue salga mal y se revierta sin que el compromiso se incumpla, que es exactamente lo que ocurre durante un canary abortado.

El segundo es de latencia. El indicador es la proporcion de peticiones al servicio de transacciones atendidas en medio segundo o menos, y el objetivo es el 99 por ciento sobre treinta dias.

El umbral de medio segundo no se eligio mirando lo que el sistema ya cumple sino desde la experiencia de quien usa la plataforma, porque es el limite a partir del cual registrar un lote deja de sentirse inmediato y empieza a sentirse como una espera. El uno por ciento restante admite que un lote con muchas transacciones o el arranque en frio de una replica ocasionalmente pasen de ese limite sin que eso constituya una degradacion del servicio.

Ambos se calculan con reglas de registro que Prometheus evalua cada treinta segundos, y de esas reglas se deriva el presupuesto de error consumido y la velocidad a la que se consume, que es lo que gobierna las alertas.

## Fallo inducido

PENDIENTE_FALLO

## Tiempo de deteccion

PENDIENTE_DETECCION

## Recorrido hasta la causa

PENDIENTE_RECORRIDO

## Tiempo de recuperacion

PENDIENTE_RECUPERACION

## Alerta faltante o sobrante

PENDIENTE_ALERTAS
