# Practica 5

Orquestacion avanzada de microservicios en Kubernetes con Helm.

Esta entrega toma los microservicios de la practica anterior y los empaqueta como un chart de Helm que instala la plataforma completa con un solo comando. El namespace de trabajo es sa-p5 y lo crea el propio chart, sin aplicar manifiestos sueltos en ningun momento.

## Los servicios que la componen

De los seis microservicios disponibles se eligieron cuatro que cierran sobre si mismos. auth-api emite los tokens de sesion, authz-service decide si un token puede acceder a una ruta, transactions-service registra lotes de transacciones y audit-service almacena la bitacora de eventos. Los tres primeros estan escritos en TypeScript y el ultimo en Python, con lo que se cumple el minimo de dos lenguajes.

Los servicios validan sus dependencias al arrancar, de modo que transactions-service se cae si no encuentra las direcciones de authz y de audit, y por eso el conjunto tuvo que elegirse completo. Cualquier subconjunto que dejara fuera a esos dos habria producido una plataforma que instala pero no funciona. Ademas transactions-service ya registraba sus eventos llamando a audit-service por HTTP, asi que convertir esa llamada en una publicacion al broker resulto ser el flujo asincrono que la practica pide, sin necesidad de inventar funcionalidad.

El API Gateway es Kong en modo declarativo, sin base de datos, con su configuracion generada por el chart.

## El chart y su estructura

El chart padre se llama sa-platform y contiene cinco subcharts propios, uno por microservicio y uno para el gateway. PostgreSQL y RabbitMQ no se reescribieron sino que se declararon como dependencias en el Chart.yaml y se resuelven desde el repositorio de Bitnami con helm dependency update.

Existen tres archivos de valores. El values.yaml base define la configuracion comun, mientras que values-dev.yaml y values-prod.yaml cambian entre ambientes el numero de replicas, los limites de recursos, el tag de la imagen y el nivel de log. El archivo _helpers.tpl define cuatro plantillas nombradas que evitan repetir el nombre del namespace, las etiquetas comunes y las cadenas de conexion a la base y al broker.

El recorrido con range genera las variables de entorno, las rutas del gateway y los dos cronjobs a partir de listas. La condicion if else ajusta el entorno de ejecucion segun el nivel de log. La funcion required exige el repositorio y el tag de cada imagen ademas de todas las credenciales, de manera que instalar sin proporcionarlas falla con un mensaje claro en lugar de desplegar algo incompleto. La funcion default cubre replicas y politica de descarga, y quote protege los valores que YAML podria interpretar mal.

El chart pasa helm lint sin observaciones y se publicaron dos versiones, la 1.0.0 inicial y la 1.1.0 que incorpora la comunicacion asincrona.

## Configuracion y manejo de credenciales

Cada servicio recibe su configuracion desde un ConfigMap generado por el chart, con el puerto, el nivel de log, las direcciones de los demas servicios y los tiempos de expiracion de los tokens. Lo sensible viaja aparte en un Secret que contiene la cadena de conexion a la base con su contrasena, el secreto de firma de los tokens y la llave de cifrado. Ambos se inyectan al contenedor con envFrom.

En el repositorio no hay ninguna credencial real. El values.yaml las declara vacias y las plantillas las exigen, mientras que las verdaderas viven en un archivo values-secrets.yaml excluido del control de versiones. Se entrega values.example.yaml con valores ficticios para que cualquiera pueda partir de ahi.

Para que un cambio de configuracion tenga efecto, la plantilla del Deployment calcula el hash del ConfigMap renderizado y lo escribe como anotacion del pod. Cuando el contenido cambia el hash cambia con el, la definicion del pod deja de coincidir y Kubernetes lo recrea. Sin esa anotacion el ConfigMap se actualizaria pero los procesos seguirian corriendo con los valores viejos en memoria.

## Persistencia

La base de datos se despliega como StatefulSet, con un PersistentVolumeClaim generado desde su plantilla de volumen y un headless service que le da identidad de red estable. Esa combinacion es la que permite que el volumen se reconecte al mismo pod cuando este se recrea.

La prueba consistio en insertar un registro con el carne del estudiante, borrar el pod de la base y consultar de nuevo una vez que el StatefulSet lo levanto. El identificador del pod cambio, confirmando que se trataba de un contenedor nuevo, pero el volumen siguio siendo el mismo y el registro continuaba ahi con su marca de tiempo original.

## Comunicacion asincrona

El flujo elegido fue el registro de auditoria. Antes, cuando transactions-service creaba un lote, llamaba a audit-service y esperaba su respuesta, de modo que una auditoria lenta o caida afectaba a la transaccion. Ahora publica el evento en una cola de RabbitMQ y retorna de inmediato, mientras audit-service lo consume por su cuenta.

El codigo ya trabajaba contra una interfaz de cliente de auditoria, asi que basto agregar una implementacion que publica al broker y dejar que el ensamblado escoja entre una y otra segun este definida la direccion del broker, sin tocar la logica de negocio.

Del lado del consumidor, audit-service levanta un hilo que escucha la cola. La cola es durable y los mensajes persistentes, y la confirmacion es manual, de manera que el mensaje solo se da por entregado despues de haberse escrito en la base. Si el procesamiento falla, el mensaje se devuelve a la cola en lugar de perderse.

Para comprobarlo se apago el consumidor por completo, se publicaron cinco eventos que quedaron acumulados en la cola sin que el productor fallara, y al restaurar el consumidor la cola se vacio sola y los cinco eventos aparecieron almacenados.

## Exposicion y aislamiento de red

Todos los servicios del namespace son de tipo ClusterIP y ninguno se expone con NodePort ni con LoadBalancer. La unica entrada al cluster es un Ingress que apunta al gateway y se sirve mediante el controlador NGINX.

Las politicas de red siguen un modelo de negacion por defecto. Una primera politica selecciona a todos los pods sin permitir nada, y las siguientes abren unicamente los caminos legitimos. El gateway acepta trafico solo desde el namespace del controlador de Ingress, cada microservicio acepta solo desde quienes lo llaman de verdad, y la base y el broker aceptan solo desde los servicios que los necesitan.

Las politicas se crearon correctamente y aun asi no bloqueaban nada, porque una NetworkPolicy es apenas una declaracion y quien la hace cumplir es el plugin de red del cluster. El plugin que minikube trae por defecto acepta los objetos y los ignora, asi que hubo que recrear el cluster con Calico. A eso se sumo que los charts de Bitnami incluyen su propia politica permisiva, y como las reglas son aditivas esa politica anulaba a la restrictiva, por lo que se desactivo para que rijan solo las del chart.

Con ambas correcciones un pod no autorizado dentro del mismo namespace queda sin acceso a los microservicios, a la base y al broker, mientras el camino legitimo desde el Ingress hacia el gateway y de ahi a los servicios sigue funcionando.

## Seguridad de los contenedores

Ninguno de los componentes usa la cuenta de servicio predeterminada y todos declaran un Role limitado a leer su propio ConfigMap, con el montaje automatico del token desactivado porque ninguno necesita hablar con la API de Kubernetes durante su operacion.

Los contenedores corren como usuario sin privilegios, con el sistema de archivos raiz en solo lectura, sin posibilidad de escalar privilegios y descartando todas las capacidades de Linux. Esa restriccion obligo a montar volumenes temporales donde los procesos si escriben, en particular el directorio de trabajo de Kong, que genera su configuracion de nginx en tiempo de ejecucion.

Las imagenes se construyen con multi-stage y base minima, lo que redujo cada una de alrededor de 1.74 GB a un rango de entre 283 y 325 MB. El detalle por servicio esta en la documentacion.

## Salud, escalado y resiliencia

El startup probe consulta cada cinco segundos con treinta intentos, lo que da hasta dos minutos y medio para que un servicio espere a la base sin ser reiniciado en el intento. El readiness probe consulta cada diez segundos y tolera tres fallos, de modo que una replica que dejo de responder sale del balanceo en menos de medio minuto sin ser destruida. El liveness probe es el mas conservador, cada veinte segundos con tres fallos, porque reiniciar un contenedor es una accion destructiva que no conviene disparar por un pico pasajero.

El autoescalado esta configurado entre dos y cinco replicas con un objetivo del setenta por ciento de CPU. El namespace tiene una cuota total de recursos y un rango de limites por contenedor, y cada servicio cuenta con un presupuesto de interrupcion que garantiza disponibilidad durante el mantenimiento. La estrategia de actualizacion prohibe apagar una replica antes de que la nueva este lista.

La actualizacion sin caida se verifico lanzando ciento cincuenta peticiones continuas por el Ingress mientras corria un upgrade. Las ciento cincuenta respondieron y ninguna fallo. El rollback se verifico cambiando un valor de configuracion, comprobandolo dentro del pod, revirtiendo con helm rollback y confirmando que volvia al valor anterior.

Al revertir hacia una revision cuya cuota de recursos era mas estrecha, esa cuota restaurada impidio que el propio despliegue creara los pods nuevos y el rollout quedo detenido, lo que deja claro que un rollback restaura el estado completo del release y no solamente aquello que uno tenia en mente al pedirlo.

## Trabajos programados

Hay dos cronjobs encadenados. El primero se ejecuta cada dos minutos e inserta en la base la fecha de ejecucion en horario de Guatemala junto al carne del estudiante. El segundo se ejecuta cada diez minutos, agrupa esos registros por hora, arma un resumen y lo publica en el broker, donde audit-service lo consume y lo almacena con el mismo mecanismo de confirmacion manual del flujo principal.

Ambos prohiben la ejecucion concurrente, limitan los reintentos y acotan cuantas ejecuciones pasadas conservan. Corren con su propia cuenta de servicio y con las mismas restricciones de seguridad que los microservicios. La zona horaria se resuelve en dos niveles, porque el cronjob declara la zona para que el disparo ocurra en horario local y el script construye la marca de tiempo con el desplazamiento explicito.

## Prueba de carga

El script de k6 sube de veinte a ciento veinte usuarios virtuales en cuatro etapas y golpea tres rutas distintas a traves del gateway. Se ejecuta desde dentro del cluster, porque al hacerlo desde el equipo anfitrion el tunel de reenvio de puertos se convierte en el cuello de botella y la prueba termina midiendo el tunel en lugar de la plataforma.

Los resultados fueron de 10786 peticiones por segundo por generador con dos generadores en paralelo, una latencia p95 de 46.94 milisegundos y una tasa de error de cero por ciento sobre mas de cuatro millones de peticiones. Bajo esa carga el autoescalado llevo al gateway de dos a cinco replicas y a los cuatro microservicios de dos a cuatro, y al cesar la carga los cinco regresaron al minimo de dos.

Ese resultado costo un ajuste de dimensionamiento, porque el autoescalado mide el consumo como porcentaje de lo reservado y no de lo disponible, asi que es muy sensible al dimensionamiento. Con reservas de ciento cincuenta milicores por replica la plataforma resultaba tan eficiente que ni siquiera a treinta y tres mil peticiones por segundo pasaba del cinco por ciento de utilizacion, y el escalado nunca se activaba. Con reservas demasiado pequenas ocurria lo contrario, porque el consumo en reposo ya marcaba la mitad del objetivo y las replicas no bajaban nunca. El valor final refleja el consumo real de estos servicios y permite que el escalado suba bajo carga y descienda en reposo.

## Documentacion y evidencias

En la carpeta de documentacion estan el diagrama de arquitectura, que distingue lo interno y lo externo al cluster y marca los flujos asincronos, el diagrama de las politicas de red con los limites que imponen, la lista completa de comandos para levantar el entorno desde cero, la tabla comparativa del tamano de las imagenes, las respuestas a las preguntas teoricas y la salida real de cada prueba capturada en el momento en que se ejecuto.
