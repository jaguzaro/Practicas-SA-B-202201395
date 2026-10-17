# Informe de operacion

Ejercicio ejecutado sobre la plataforma de microservicios desplegada en el namespace sa-p8.

## SLO declarados

El objetivo de disponibilidad mide la proporcion de peticiones que no terminan en un codigo de familia cinco sobre todo el trafico que los tres servicios instrumentados atienden en produccion, y se compromete al 99.5 por ciento sobre una ventana de treinta dias. El numero responde a lo que la arquitectura puede sostener, dos replicas por servicio con una sola instancia de base de datos y una sola de broker, sin replicacion ni conmutacion automatica, de modo que prometer tres nueves seria prometer algo que la infraestructura no permite cumplir, y el medio por ciento restante deja margen para que un despliegue salga mal y se revierta sin incumplir el compromiso.

El objetivo de latencia mide la proporcion de peticiones al servicio de transacciones atendidas en medio segundo o menos y se compromete al 99 por ciento sobre la misma ventana. El umbral no se eligio mirando lo que el sistema ya cumple sino desde la experiencia de quien usa la plataforma, porque medio segundo es el limite a partir del cual registrar un lote deja de sentirse inmediato, y el uno por ciento admitido cubre los lotes con muchas transacciones y el arranque en frio de una replica. Ambos se calculan con reglas de registro que Prometheus evalua cada treinta segundos, y de ellas se derivan el presupuesto de error consumido y su velocidad de consumo, que es lo que gobierna las alertas.

## Fallo inducido

El listado de lotes del servicio de transacciones pasa de una consulta unica que devuelve todos los lotes a una consulta adicional por cada lote del resultado, presentada en el commit como un enriquecimiento del listado con el detalle de cada lote. Sobre los 2265 lotes almacenados son 2266 lecturas en lugar de una, y el efecto crece con los datos en lugar de aparecer de golpe. La eleccion es deliberadamente distinta de la de la practica anterior, donde el fallo impedia que el contenedor arrancara y cualquier sonda de salud lo delataba. Aqui el codigo compila, las quince pruebas unitarias pasan, la ruta responde con codigo 200 y el contenido es correcto, de modo que una prueba sintetica de codigos de respuesta promueve la version sin objetar nada. Lo unico que cambia es el tiempo.

## Tiempo de deteccion

El canary aplico el commit defectuoso a las 18:03:32 UTC, arranco la medicion sobre la version candidata a las 18:03:54 y la declaro fallida a las 18:04:39, sesenta y siete segundos despues de que la version entrara al cluster. Lo que la detuvo fue el percentil 95 de latencia, 5 segundos frente al umbral de medio segundo, mientras la tasa de error de la misma medicion dio cero, que es la prueba de que un analisis basado en codigos de respuesta habria promovido la version.

Cuando esta misma version alcanzo produccion en un intento anterior, la alerta de quema rapida tardo cincuenta y cinco minutos en estar activa. La diferencia es el proposito de cada mecanismo, porque la alerta exige que la ventana de una hora y la de seis horas superen su umbral a la vez para no despertar a nadie por un pico.

## Recorrido hasta la causa

El punto de partida fue la alerta de presupuesto de latencia, sin informacion previa sobre que se habia desplegado. La regla de registro del objetivo mostro la proporcion de peticiones bajo medio segundo caida al 95.5 por ciento frente al 99 comprometido, el percentil 95 desagregado por ruta senalo una sola responsable con 5000 milisegundos frente a los cinco del resto, el consumo de CPU descarto la falta de recursos, el almacen de registros devolvio una peticion concreta de 5652 milisegundos con estado 200 y su identificador de traza, y esa traza mostro que el tiempo no se iba en la llamada al servicio de autorizacion, que respondio en un milisegundo, sino dentro del span del propio servicio de transacciones.

El recorrido tomo cinco segundos, muy por debajo de los tres minutos exigidos, y quedo registrado con marcas de tiempo en P10/evidencias/sintoma-a-causa.txt. Lo que lo hace posible es el identificador de traza en cada linea de registro, que permite pasar de una metrica agregada a una peticion individual y de ahi al reparto del tiempo entre servicios.

## Tiempo de recuperacion

La recuperacion fue simultanea a la deteccion. A las 18:04:39 UTC Rollouts aborto la revision y devolvio el selector del servicio canario al conjunto de replicas sano, de modo que los pods que atendian produccion siguieron siendo los de la version anterior y la defectuosa nunca recibio el total del trafico. Del commit malo al trafico restablecido pasaron sesenta y siete segundos sin intervencion humana. Lo que no se recupera solo es la declaracion, porque el repositorio de manifiestos sigue pidiendo la version defectuosa y el Rollout queda degradado hasta que una persona revierte el commit, asi que el tiempo de recuperacion del servicio y el del sistema son dos numeros distintos y solo el primero esta automatizado.

## Alerta faltante o sobrante

Falta una alerta sobre la saturacion de las dependencias compartidas. Las tres alertas definidas vigilan el camino de la peticion, que es donde el usuario siente el dano, pero la base de datos y el broker son instancias unicas que los cinco servicios comparten y nada las observa de forma directa. Durante el recorrido la base de datos aparecio al 70 por ciento de su limite de CPU y ese dato hubo que buscarlo a mano cuando deberia haber llegado solo, porque una saturacion de esa instancia degradaria los dos objetivos a la vez y las alertas de presupuesto dirian que algo esta mal sin decir que es compartido.

Falta tambien la contraparte de quema lenta del objetivo de latencia, que solo tiene la ventana rapida mientras la disponibilidad tiene las dos, de modo que una degradacion de medio punto porcentual sostenida durante dias consumiria el presupuesto del mes sin activar nada. Ninguna de las tres alertas existentes sobra, porque las de quema rapida se activaron solo mientras el fallo estuvo vivo y la de quema lenta no se activo en ningun momento, que es el comportamiento esperado para un deterioro prolongado que no ocurrio.
