# Informe de la prueba de recuperacion ante desastres

Ejercicio ejecutado el 24 de septiembre de 2026 sobre la plataforma de microservicios desplegada en Google Kubernetes Engine.

## Objetivos declarados

Se comprometio un tiempo de recuperacion de 45 minutos y un punto de recuperacion de 6 horas, ambos escritos y justificados antes de ejecutar la prueba, en evidencias/objetivos-declarados.txt.

El tiempo de recuperacion salio de sumar lo que cada etapa tardaba de forma observada mas margen. La creacion del cluster en Google ronda los diez minutos y no depende de nosotros, la instalacion de ArgoCD y la sincronizacion de las veintidos aplicaciones rondaba otros diez, la restauracion del volumen se habia medido en algo mas de un minuto, y el resto era holgura para que una persona ajena al sistema pudiera seguir el procedimiento, verificar cada paso y reaccionar ante un imprevisto.

El punto de recuperacion se fijo en seis horas porque es el intervalo del calendario de respaldos mas frecuente. La plataforma registra ejecuciones programadas y eventos de auditoria, informacion valiosa para trazabilidad pero que no representa dinero ni compromisos con terceros, de modo que respaldar con mas frecuencia no compensaba su costo.

## Escenario ejecutado

Primero se tomo un respaldo completo del namespace de produccion, incluyendo los volumenes persistentes por sistema de archivos, que quedo registrado a las 17:31:16 con 88 filas en la tabla de ejecuciones programadas. Despues se dejo la plataforma operando cinco minutos mas para que acumulara escrituras posteriores al respaldo, y a las 17:36:28 tenia 91 filas.

El desastre consistio en destruir el entorno completo con Terraform, no en apagarlo. A las 20:29:22 se ordeno la destruccion y a las 20:34:18 no quedaba plano de control, ni nodos, ni volumenes, ni balanceador, ni ninguno de los recursos que vivian dentro del cluster. Lo unico que sobrevivio fue lo que por diseno vive fuera, el codigo en los dos repositorios, el estado de Terraform en su bucket, la llave que descifra los secretos y los respaldos, tambien en almacenamiento de objetos.

La recuperacion empezo a las 20:34:27 ejecutando el punto de entrada unico, sin ningun paso manual previo, y termino cuando el gateway respondio una peticion de negocio con los datos ya restaurados.

## Tiempos medidos

El tiempo de recuperacion real fue de 1 hora y 42 minutos, desde las 20:29:22 en que se ordeno la destruccion hasta las 22:11:42 en que el sistema respondio con su contenido recuperado.

El desglose muestra donde se fue el tiempo. La destruccion tomo cinco minutos. La creacion del cluster y su grupo de nodos, ocho minutos y medio, de 20:34:30 a 20:43:10. La instalacion de los namespaces, el RBAC, la llave de secretos, ArgoCD y la aplicacion raiz, un minuto y medio. A partir de ahi ArgoCD empezo a levantar las veintidos aplicaciones, y fue en esa fase donde aparecio el problema que explica la brecha. La restauracion de los datos, una vez el sistema estuvo estable, tomo desde las 21:42:51 hasta las 22:11:42, aunque la base ya tenia su contenido bastante antes y el resto fue espera a que el resto de piezas terminara de asentarse.

## Perdida medida

Se perdieron tres filas, las escritas entre el momento del respaldo y el del desastre. El respaldo tenia 88 y antes de la destruccion habia 91. Al restaurar se recuperaron las 88, verificadas una por una con el carne del estudiante y con marcas de tiempo coherentes, desde la primera fila del dia hasta la ultima anterior al respaldo. Tambien volvio el contenido de la otra tabla del mismo volumen, la de eventos de auditoria.

Cinco minutos de perdida frente a las seis horas comprometidas. El punto de recuperacion se cumplio con holgura, y eso no es merito sino consecuencia de que el respaldo se tomo poco antes del desastre. En un incidente real la perdida seria de hasta seis horas, que es lo que el objetivo admite.

## Puntos unicos de fallo detectados

El mas importante lo descubrio la propia prueba. A los treinta minutos de iniciada la reconstruccion, el controlador de ArgoCD entro en un bucle de reinicios por agotamiento de memoria. Su limite estaba fijado en 768 mebibytes, dimensionado cuando el sistema tenia menos aplicaciones, y en un arranque en frio las veintidos reconcilian simultaneamente contra un cluster vacio, lo que multiplica el consumo respecto de la operacion normal. Mientras el controlador moria y volvia a arrancar, ninguna sincronizacion progresaba, varias operaciones quedaron colgadas en estado de ejecucion y las aplicaciones de los microservicios se quedaron sin pods. El sintoma visible era confuso, porque los Rollout existian pero se quejaban de que faltaba su plantilla de analisis, cuando en realidad lo que faltaba era quien terminara de aplicarla.

Es un fallo que solo se manifiesta en una reconstruccion total. Durante la operacion diaria, e incluso al apagar y encender el cluster conservando su contenido, el controlador nunca alcanza ese pico. Si el desastre hubiera ocurrido de verdad, se habria descubierto en el peor momento posible.

El segundo hallazgo es una condicion de carrera. Las olas de sincronizacion ordenan la creacion de las aplicaciones, pero no esperan a que cada una termine, de modo que las aplicaciones de microservicios empiezan a sincronizar antes de que los controladores hayan terminado de instalar sus tipos de recurso. El resultado son sincronizaciones fallidas que ArgoCD reintenta, lo que funciona pero alarga la reconstruccion.

El tercero es de dependencia externa. Toda la recuperacion depende de Google Cloud, porque alli viven el estado de Terraform, la llave de los secretos y los respaldos. Un incidente que afecte al proyecto o a la cuenta entera dejaria las tres piezas fuera de alcance a la vez.

Un cuarto, menor pero real, aparecio durante un intento previo. La maquina desde la que se ejecutaba la prueba perdio resolucion de nombres a mitad del proceso, y el guion continuo ejecutando pasos que ya no tenian sentido. El procedimiento no verificaba que cada etapa hubiera terminado bien antes de seguir con la siguiente.

## Brecha y plan

La brecha es de 57 minutos, un 127 por ciento por encima del objetivo. No se debe a que las etapas previstas tardaran mas de lo estimado, porque la creacion del cluster y la restauracion de los datos se ajustaron a lo calculado, sino a un defecto latente que la prueba puso al descubierto y cuyo diagnostico consumio media hora.

Ese defecto ya esta corregido. El limite de memoria del controlador subio a dos gibibytes y la reserva a 768 mebibytes, escrito en el codigo de Terraform, de modo que cualquier reconstruccion futura nace con el valor correcto. Con esa correccion, el camino critico queda en los ocho minutos y medio del cluster, unos diez de sincronizacion y algo mas de uno de restauracion, con lo que el objetivo de 45 minutos vuelve a ser alcanzable. La comprobacion honesta es repetir la prueba y medir de nuevo, no asumirlo.

Para la condicion de carrera, la correccion es declarar en las aplicaciones de microservicios una politica de reintento con espera creciente, de modo que los fallos por tipos de recurso aun inexistentes se resuelvan solos sin intervencion y sin alargar tanto la reconstruccion.

Para la dependencia de un unico proveedor, lo proporcionado a esta plataforma es conservar al menos la llave de descifrado y una copia de los respaldos en un almacenamiento distinto. No elimina el riesgo, pero evita que la perdida de la cuenta convierta el repositorio publico de manifiestos en contenido ilegible para siempre.

Para la fragilidad del procedimiento, el guion de la prueba ya verifica la conectividad antes de empezar, comprueba que el respaldo previo se completo antes de destruir nada y aborta si la destruccion o el arranque no terminan correctamente, en lugar de continuar a ciegas.
