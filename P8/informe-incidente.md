# Informe de incidente

Intento de despliegue de la version v1.2.1 de transactions-service en el ambiente de produccion, namespace sa-p8, el 17 de septiembre de 2026 a las 22:38 hora de Guatemala.

## Que fallo

La version v1.2.1 incorporo una simplificacion en la funcion que extrae el token de la cabecera Authorization del servicio de transacciones. El codigo nuevo daba por hecho que la cabecera siempre existe y llamaba a split sobre ella sin comprobarlo, de modo que cualquier peticion sin token producia un TypeError por leer una propiedad de undefined. Express reenvia esa excepcion al manejador de errores y el servicio respondia 500 en lugar del 401 que corresponde a una sesion inexistente. El defecto era invisible para el pipeline porque el codigo compila, las quince pruebas unitarias cubren las reglas de validacion y no el middleware, la imagen no tenia vulnerabilidades y la firma era valida. Tambien era invisible para Kubernetes, porque la ruta de salud no pasa por ese middleware y las sondas la veian sana.

## Como se detecto

Lo detecto el analisis del primer paso del canary. Al fusionarse el pull request en el repositorio de manifiestos, ArgoCD sincronizo el Rollout y Argo Rollouts levanto una replica de la version nueva junto a las dos estables, con un peso declarado del veinte por ciento. Tras quince segundos de espera ejecuto el Job de k6 del AnalysisTemplate contra el Service canary, que solo enruta a la replica nueva. El script hizo 766 iteraciones en veinte segundos con cinco usuarios virtuales y encontro que GET /health respondia 200 pero GET y POST /transactions/batches respondian 500 en las 766 ocasiones. Se cruzaron dos umbrales a la vez, la tasa de checks correctos quedo en 33.33 por ciento frente al minimo exigido de 99, y la tasa de peticiones fallidas en 66.66 por ciento frente al maximo permitido de 1. La metrica prueba-de-humo quedo en Failed y como el limite de fallos del analisis es cero, el resultado fue inmediato.

## Como se contuvo

Argo Rollouts aborto el rollout sin intervencion humana. Marco la revision como abortada, escalo a cero el ReplicaSet de v1.2.1 y dejo el ReplicaSet estable de v1.2.0 sirviendo todo el trafico, exactamente como estaba antes del intento. Durante la ventana completa del incidente se midio el trafico real de usuarios contra el gateway con una peticion autenticada cada dos segundos, y las 159 peticiones respondieron 200. Ninguna llego a la replica defectuosa porque el Service estable nunca la incluyo, y el unico consumidor que la vio fue el analisis. ArgoCD reporto la aplicacion como Degraded, que es la senal para el equipo de que el estado deseado del repositorio no pudo aplicarse.

## Tiempo de recuperacion

Desde que el Rollout empezo a progresar a las 22:38:20 hasta que quedo abortado a las 22:39:22 pasaron 62 segundos, de los cuales 33 fueron la creacion de la replica y la espera de estabilizacion y 29 la ejecucion del analisis. El tiempo de afectacion a usuarios fue cero. La restauracion del estado deseado se hizo publicando la version v1.2.2 con la extraccion del token corregida, que recorrio el mismo pipeline y el mismo canary y quedo promovida como estable.

## Como prevenirlo

El middleware de acceso necesita una prueba unitaria que lo ejercite sin cabecera, con cabecera mal formada y con token valido, porque la cobertura actual solo alcanza la logica de negocio y por eso el pipeline no vio el defecto. Ademas conviene que las rutas que el analisis del canary ya comprueba se ejecuten tambien como prueba de contrato en el job de pruebas, contra el servicio levantado en el runner, para detectar este tipo de regresion antes de construir la imagen. El mecanismo de contencion funciono como se diseno y no requiere cambios, pero el analisis solo cubre las rutas declaradas en los values del chart, asi que cada ruta nueva o cambio de contrato debe ir acompanado de su entrada en esa lista.
