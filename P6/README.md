# Practica 6

Despliegue de la plataforma en un cluster de Kubernetes en la nube.

La plataforma de microservicios corre sobre un cluster administrado de Google Kubernetes Engine, con las imagenes publicadas en un registro privado y el sistema accesible desde internet.

La direccion publica del sistema es 35.193.64.224 en el puerto 8000.

## Que compone la plataforma

La plataforma reune cuatro microservicios, un API Gateway, una base de datos, un broker de mensajeria y dos trabajos programados, todo empaquetado como un chart de Helm que se instala con un solo comando.

Cuatro decisiones definen como se adapta al entorno de nube. Las imagenes se descargan desde un registro privado en lugar de residir en la maquina. El almacenamiento persistente usa la clase de almacenamiento que ofrece el proveedor. La entrada al sistema es un Service de tipo LoadBalancer con direccion publica. Y la politica de red del gateway acepta el trafico que llega desde internet, conservando el aislamiento entre los demas componentes.

## El cluster

Se creo un cluster zonal llamado sa-p6 en la zona us-central1-a, con tres nodos e2-medium y discos de veinte gigabytes.

El cluster se dimensiono en tres nodos y no en dos. Un nodo e2-medium tiene dos procesadores virtuales, de los cuales solo novecientos cuarenta milicores quedan disponibles para las aplicaciones, porque el sistema administrado y el complemento de red reservan el resto. Con dos nodos la capacidad quedo al noventa y ocho por ciento y varios pods no encontraban donde ubicarse.

El cluster se creo con la politica de red habilitada. Sin ese ajuste las NetworkPolicies del chart existirian como objetos pero no bloquearian nada, porque quien las hace cumplir es el complemento de red y no Kubernetes por si mismo.

## El registro de imagenes

Las imagenes viven en Artifact Registry, en un repositorio privado llamado sa-platform ubicado en us-central1. Privado significa que nadie fuera del proyecto puede descargarlas.

Como el registro y el cluster estan en el mismo proyecto, los nodos se autentican con su propia identidad y no hace falta configurar credenciales del registro dentro del chart. Esa identidad necesita permiso explicito de lectura sobre el registro, y sin el los pods fallan al descargar la imagen con un error de autorizacion.

Las imagenes se construyen para la arquitectura amd64, que es la de los nodos del proveedor. Una imagen compilada para arm64 en el equipo de desarrollo produce contenedores que no arrancan en el cluster, aunque el codigo sea identico.

## La exposicion publica

El Service del gateway es de tipo LoadBalancer, lo que hace que el proveedor cree un balanceador real y le asigne una direccion publica. Se prefirio esta opcion sobre un Ingress porque evita instalar y mantener un controlador adicional dentro del cluster, mientras que el enrutamiento por ruta ya lo resuelve el propio gateway.

Los demas servicios son internos y no resultan alcanzables desde fuera, de manera que el gateway es el unico punto de entrada al sistema.

## La base de datos

Se despliega un unico servidor de PostgreSQL que aloja tres bases separadas, una para cada servicio que persiste datos. El servicio de autenticacion usa authdb, el de transacciones usa transactionsdb y el de auditoria usa auditdb, mientras que el de autorizacion no guarda nada porque solo valida tokens.

Cada servicio recibe una cadena de conexion que apunta unicamente a su propia base, de manera que ninguno puede leer ni escribir los datos de otro. Eso corresponde al patron de base de datos por servicio en su variante de base separada sobre servidor compartido, y no debe confundirse con el antipatron de base compartida, donde varios servicios accederian a las mismas tablas.

La contrapartida de compartir el motor es que los tres servicios dependen del mismo pod. Se eligio asi por consumo de recursos, ya que tres servidores independientes implicarian tres volumenes y tres veces la memoria reservada.

## Las credenciales

Las contrasenas de la base y del broker, el secreto de firma de los tokens y la llave de cifrado se generaron al azar para este despliegue y viven en un archivo excluido del control de versiones. El chart las exige al instalar, asi que un despliegue sin ellas falla con un mensaje claro en lugar de levantar el sistema con valores vacios. En el repositorio se entrega un archivo de ejemplo con valores ficticios.

## Procedimiento de despliegue

Los comandos se ejecutan desde la carpeta P6. El componente de autenticacion de GKE queda fuera del PATH en algunas instalaciones, de modo que conviene anteponerlo.

```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:$PATH
```

Se prepara el proyecto.

```bash
gcloud auth login
gcloud config set project softwareavanz
gcloud services enable container.googleapis.com artifactregistry.googleapis.com compute.googleapis.com
```

Se crea el registro de imagenes y se autentica Docker contra el.

```bash
gcloud artifacts repositories create sa-platform --repository-format=docker --location=us-central1
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Se construyen las imagenes para la arquitectura de los nodos, se etiquetan con la ruta del registro y se suben.

```bash
docker build --platform linux/amd64 -t sa-auth-api:1.0.0-amd64 ../P5/services/auth-api
docker tag sa-auth-api:1.0.0-amd64 us-central1-docker.pkg.dev/softwareavanz/sa-platform/auth-api:1.0.0
docker push us-central1-docker.pkg.dev/softwareavanz/sa-platform/auth-api:1.0.0
```

El mismo procedimiento aplica a authz-service, transactions-service, audit-service y a la imagen de los trabajos programados.

Se crea el cluster. Es zonal y no regional, porque un cluster regional levanta los nodos solicitados en cada una de las tres zonas y ademas no entra en la capa gratuita de la tarifa de administracion.

```bash
gcloud container clusters create sa-p6 --zone us-central1-a --num-nodes 3 --machine-type e2-medium --disk-size 20 --disk-type pd-standard --enable-network-policy --release-channel regular
```

Se conecta kubectl al cluster.

```bash
gcloud container clusters get-credentials sa-p6 --zone us-central1-a
```

Se concede a los nodos permiso de lectura sobre el registro.

```bash
gcloud projects add-iam-policy-binding softwareavanz --member="serviceAccount:558971310301-compute@developer.gserviceaccount.com" --role="roles/artifactregistry.reader"
```

Se preparan las credenciales a partir del archivo de ejemplo.

```bash
cp charts/sa-platform/values.example.yaml charts/sa-platform/values-secrets.yaml
```

Se resuelven las dependencias del chart y se despliega.

```bash
helm dependency update charts/sa-platform
helm install sa-platform charts/sa-platform -f charts/sa-platform/values-gcp.yaml -f charts/sa-platform/values-secrets.yaml
```

La direccion publica tarda un par de minutos en asignarse y aparece en la columna de IP externa del servicio del gateway.

```bash
kubectl get svc gateway -n sa-p6
```

## Costos

El gasto se concentra en los nodos. Cada maquina e2-medium cuesta cerca de 24 dolares mensuales, de modo que las 3 del cluster suman alrededor de 73 dolares al mes si se dejan encendidas todo el mes.

Le sigue el balanceador de carga, que cobra unos 18 dolares mensuales exista o no trafico, porque es infraestructura reservada y no un objeto logico dentro del cluster.

Los discos persistentes suman 70 gigabytes en total, resultado de 20 gigabytes por cada uno de los 3 nodos mas 5 del servidor de base de datos y 5 del broker. A razon de centavos por gigabyte, el conjunto ronda los 3 dolares mensuales.

El almacenamiento del registro es marginal, ya que las 5 imagenes ocupan cerca de 1.5 gigabytes y se cobran alrededor de 0.10 dolares por gigabyte al mes, lo que no llega a 0.20 dolares.

La tarifa de administracion del cluster no se cobra, porque la capa gratuita cubre 1 cluster zonal por cuenta de facturacion. Un cluster regional si la pagaria, cerca de 73 dolares mensuales adicionales.

En conjunto el despliegue ronda los 95 dolares mensuales si se mantiene encendido de forma permanente, lo que equivale a unos 3.20 dolares por dia. Para un uso de 2 a 3 dias el gasto se ubica entre 6 y 10 dolares, y con los creditos de bienvenida que Google otorga a las cuentas nuevas el costo efectivo es 0.

Para reducirlo, las medidas mas efectivas son ajustar el numero y tamano de los nodos a lo que la carga realmente necesita, reducir el grupo de nodos a 0 mientras el sistema no se usa, lo que conserva la direccion publica y los datos, y eliminar el cluster al terminar. Elegir 1 zona en lugar de una region evita multiplicar los nodos por 3 y mantiene la tarifa de administracion sin cargo. Dimensionar los discos al minimo necesario tambien ayuda, ya que el tamano por defecto de 100 gigabytes por nodo es 5 veces mayor que los 20 que aqui se utilizan.

## Procedimiento de eliminacion

Se ejecuta cuando el sistema deja de necesitarse. El orden importa, porque desinstalar primero el release libera el balanceador y los volumenes, mientras que eliminar el cluster de entrada podria dejar el balanceador huerfano generando cargo.

Se desinstala el release, lo que borra tambien el balanceador y los volumenes asociados.

```bash
helm uninstall sa-platform
```

Se elimina el namespace.

```bash
kubectl delete namespace sa-p6
```

Se elimina el cluster, que se lleva consigo los nodos y sus discos.

```bash
gcloud container clusters delete sa-p6 --zone us-central1-a --quiet
```

Se elimina el repositorio de imagenes.

```bash
gcloud artifacts repositories delete sa-platform --location=us-central1 --quiet
```

Se verifica que no quedo nada cobrando. Las cinco consultas deben devolver listas vacias, y la de reglas de reenvio merece atencion especial, porque un balanceador que sobreviva al cluster sigue generando cargo aunque ya no haya nada detras.

```bash
gcloud container clusters list
gcloud compute instances list
gcloud compute disks list
gcloud compute forwarding-rules list
gcloud artifacts repositories list
```

## Preguntas teoricas

### Que es un cluster de Kubernetes administrado y que diferencias tiene frente a uno local

Un cluster administrado es aquel donde el proveedor se hace cargo del plano de control, es decir del servidor de API, el planificador, el almacen de estado y los controladores, mientras que quien despliega solo opera las cargas de trabajo. En uno local todo eso corre en la propia maquina y queda bajo responsabilidad de quien lo instala.

En el local no existe una direccion publica, de modo que para probar el sistema desde fuera hay que abrir un tunel de reenvio de puertos que ademas se convierte en cuello de botella. En el administrado, pedir un Service de tipo LoadBalancer hace que el proveedor cree un balanceador real con una direccion enrutable desde internet.

El almacenamiento tambien cambia, porque un cluster local simula los volumenes sobre el disco de la maquina mientras que el administrado los crea como discos reales del proveedor, con su propia redundancia, y estos sobreviven aunque el nodo desaparezca.

En local el complemento de red por defecto acepta las politicas de red y las ignora, lo que da una falsa sensacion de aislamiento, mientras que en el administrado hay que habilitar la funcion de forma explicita al crear el cluster.

Aparecen ademas dos dimensiones que en local no existen. Una es la identidad, porque los nodos tienen una cuenta de servicio propia y necesitan permisos concedidos para algo tan basico como descargar una imagen. La otra es el costo, porque cada nodo, cada disco y cada balanceador se cobra por hora. Un ultimo punto es que la capacidad util es menor de lo que aparenta.

### Que es un Service de tipo LoadBalancer y como lo implementa el proveedor de nube

Es un tipo de Service que le pide a Kubernetes una direccion accesible desde fuera del cluster. Por si mismo Kubernetes no sabe crear balanceadores, de modo que la peticion la atiende un controlador del proveedor que observa esos objetos y traduce cada uno en infraestructura real.

En el caso de Google, al crear el Service el controlador aprovisiona un balanceador de red, reserva una direccion publica, define una regla de reenvio hacia el puerto solicitado y registra como destinos a los nodos del cluster. El trafico entra por esa direccion, llega a cualquiera de los nodos y desde ahi se reparte entre los pods que coinciden con el selector.

Por eso la direccion tarda un par de minutos en aparecer, y por eso tambien el balanceador cobra por hora aunque no reciba trafico, porque es infraestructura reservada y no un objeto logico dentro del cluster.

Conviene notar que un balanceador de este tipo trabaja al nivel de conexiones y no entiende de rutas ni de nombres de dominio. Cuando se necesita enrutar por ruta o por host la herramienta adecuada es un Ingress. Aqui el enrutamiento por ruta lo resuelve el propio API Gateway dentro del cluster, de manera que un balanceador simple es suficiente.

### Que es un registro de contenedores y por que es necesario para desplegar en la nube

Es un servidor donde se almacenan y versionan imagenes de contenedor para que otros puedan descargarlas. Cumple para las imagenes el mismo papel que un repositorio de paquetes cumple para las bibliotecas de un lenguaje.

Es necesario porque los nodos de un cluster en la nube no tienen forma de ver las imagenes construidas en la maquina del desarrollador. En local ese problema se resuelve cargando la imagen directamente dentro del cluster, pero en la nube el nodo esta en un centro de datos remoto y su unica manera de obtenerla es descargarla de un lugar accesible por red. Si no existe, el pod queda atrapado en un ciclo de fallos de descarga.

Este despliegue usa Artifact Registry con un repositorio privado, de modo que solo el proyecto puede descargar esas imagenes. La autenticacion se resuelve sola porque el registro y el cluster viven en el mismo proyecto y los nodos usan su propia identidad, aunque esa identidad necesita que se le conceda el permiso de lectura de forma explicita.

Un detalle que suele pasarse por alto es la arquitectura del procesador, ya que una imagen construida en un equipo con procesador arm no se ejecuta en nodos amd aunque el codigo sea identico.

### Que componentes del cluster administra el proveedor y cuales siguen siendo responsabilidad de quien despliega

El proveedor administra el plano de control completo, incluida su disponibilidad, sus copias de seguridad y sus actualizaciones. Tambien se encarga de aprovisionar los nodos, de la imagen del sistema operativo que ejecutan, de los complementos de red y almacenamiento, y de crear la infraestructura que los objetos del cluster solicitan, como balanceadores y discos.

Quien despliega sigue siendo responsable de todo lo que ocurre dentro. Eso incluye las cargas de trabajo y su configuracion, el dimensionamiento de reservas y limites, las sondas que determinan si un contenedor esta sano, las politicas de red, los permisos de las cuentas de servicio, la gestion de las credenciales, el contenido y la seguridad de las imagenes, y las copias de seguridad de los datos de la aplicacion.

Que el complemento de red exista y funcione corresponde al proveedor, pero habilitarlo al crear el cluster y escribir politicas correctas corresponde a quien despliega. Del mismo modo, el proveedor ofrece el registro de imagenes, pero conceder a los nodos permiso para leerlo es trabajo propio. Tambien queda de ese lado la vigilancia del costo, porque el proveedor cobra lo que se le pida sin advertir que un recurso quedo olvidado.

### Que costos genera el despliegue realizado y como podrian reducirse

El gasto se concentra en los nodos, seguidos por el balanceador, luego los discos persistentes y por ultimo el almacenamiento del registro, que es marginal. La tarifa de administracion no se cobra por tratarse de un cluster zonal.

Para reducirlo, las medidas mas efectivas son ajustar el numero y tamano de los nodos a lo que la carga necesita, apagar el grupo de nodos cuando el sistema no se usa, y eliminar el cluster al terminar. Elegir una zona unica en lugar de una region evita multiplicar los nodos por tres, y dimensionar los discos al minimo necesario tambien ayuda, ya que el tamano por defecto suele ser mucho mayor que el requerido.

## Evidencias

Las capturas de funcionamiento estan en evidencias.md.
