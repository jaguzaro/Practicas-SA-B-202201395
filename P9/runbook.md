# Runbook de recuperacion

Procedimiento para reconstruir la plataforma desde cero y devolverle sus datos. Esta escrito para que lo ejecute alguien que no conoce el sistema y sin necesidad de consultar a su autor. Cada paso indica que se espera ver antes de continuar.

## Antes de empezar

Se necesitan cuatro herramientas en la maquina desde la que se ejecuta, gcloud, terraform, kubectl y velero, y acceso al proyecto softwareavanz de Google Cloud con permiso para crear clusters, cuentas de servicio y objetos en Cloud Storage.

El repositorio de codigo es https://github.com/jaguzaro/Practicas-SA-B-202201395 y el de manifiestos es https://github.com/jaguzaro/Practicas-SA-B-202201395-gitops. Todo el procedimiento se ejecuta desde la carpeta P9 del primero.

Para que Terraform pueda hablar con Google hace falta una sesion de credenciales predeterminadas. Si no existe, se obtiene con

    gcloud auth application-default login

Si el acceso al cluster se hace desde una red que no es la del autor, no hace falta ninguna preparacion adicional, porque el plano de control es publico aunque los nodos sean privados.

## Que se pierde y que no

Conviene saber de antemano que sobrevive a la destruccion total del entorno. El codigo de la infraestructura y los charts viven en el repositorio de codigo. Los manifiestos, las Application de ArgoCD y los secretos cifrados viven en el repositorio de manifiestos. El estado de Terraform vive en gs://softwareavanz-terraform-estado con versionado. La llave que descifra los secretos vive en gs://softwareavanz-respaldos/llaves. Los respaldos de los volumenes viven en gs://softwareavanz-respaldos/velero. Nada de eso esta dentro del cluster, de modo que perder el cluster no compromete ninguna de esas piezas.

Lo unico que se pierde son las escrituras posteriores al ultimo respaldo.

## Reconstruccion completa

El punto de entrada es uno solo. Desde la carpeta P9 se ejecuta

    ./bootstrap.sh

El guion comprueba las herramientas y las credenciales, crea el cluster y su grupo de nodos con Terraform, obtiene las credenciales de acceso, aplica el resto de la infraestructura, que son los namespaces con sus cuotas y su RBAC, la llave de secretos tomada del bucket, ArgoCD y la aplicacion raiz, y despues espera a que ArgoCD termine de levantar la plataforma. Va escribiendo marcas de tiempo en evidencias/reconstruccion.txt.

Durante la primera etapa, que tarda alrededor de diez minutos, no hay nada que hacer. Google esta creando el plano de control, el enrutador de salida y las tres maquinas.

Cuando el guion escriba que las aplicaciones estan Synced y Healthy, la plataforma esta en linea. Si en cambio escribe que el tiempo se agoto, se continua con el diagnostico que aparece mas abajo.

### Verificacion

Las veintidos aplicaciones deben estar sincronizadas y sanas.

    kubectl get applications -n argocd

Los catorce secretos sellados deben haberse descifrado, lo que confirma que la llave se restauro correctamente.

    kubectl get sealedsecrets -A

El gateway debe tener una direccion publica asignada. La direccion cambia en cada reconstruccion, de modo que hay que leerla y no asumirla.

    kubectl -n sa-p8 get svc gateway

Con esa direccion, la plataforma debe responder. Una peticion sin credenciales a una ruta protegida tiene que devolver 401 y no otro codigo.

    IP=$(kubectl -n sa-p8 get svc gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    curl -s -o /dev/null -w '%{http_code}\n' http://$IP:8000/transactions/batches

## Restauracion de los datos

La reconstruccion levanta la plataforma con la base de datos vacia. Para devolverle su contenido se parte del respaldo mas reciente.

Primero se elige el respaldo. La columna de estado tiene que decir Completed.

    velero backup get

ArgoCD vigila la aplicacion de datos y la reconstruye si algo la borra, de modo que competiria con la restauracion. Antes de tocar nada hay que quitarle la sincronizacion automatica.

    kubectl -n argocd patch application datos --type merge \
      -p '{"spec":{"syncPolicy":{"automated":null}}}'

Se elimina la base y su volumen, que en este momento estan vacios o contienen datos que se van a reemplazar.

    kubectl -n sa-p8 delete statefulset postgres
    kubectl -n sa-p8 delete pvc data-postgres-0

Se pide la restauracion indicando el respaldo elegido. Velero recrea el volumen, lo llena desde el almacenamiento de objetos y vuelve a crear la base.

    velero restore create --from-backup NOMBRE_DEL_RESPALDO \
      --include-namespaces sa-p8 --wait

Se espera a que la base acepte conexiones.

    kubectl -n sa-p8 get pod postgres-0 -w

Y se devuelve la vigilancia a ArgoCD.

    kubectl -n argocd patch application datos --type merge \
      -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'

### Verificacion

El contenido restaurado se comprueba mirando los datos, no solo la existencia del volumen. La tabla de ejecuciones programadas debe tener filas, todas con el carne 202201395, y marcas de tiempo anteriores al respaldo.

    cd P9/pruebas && ./datos.sh detalle 5

La cuenta de filas se compara con la que tenia el sistema antes del incidente. La diferencia es la perdida real, y corresponde a las escrituras ocurridas despues del ultimo respaldo.

## Mantenimiento de un nodo sin interrumpir el servicio

Retirar un nodo de servicio no consiste en drenarlo directamente. El balanceador externo tarda varios ciclos de comprobacion en dejar de enviarle trafico, y durante esa ventana una parte de las peticiones se pierde. El orden correcto es sacar primero el gateway de ese nodo, esperar a que el balanceador lo note, y solo entonces drenar.

    NODO=nombre-del-nodo
    kubectl cordon $NODO
    kubectl -n sa-p8 delete pod -l app=gateway --field-selector spec.nodeName=$NODO

Se esperan unos setenta y cinco segundos, tiempo suficiente para que el balanceador acumule comprobaciones fallidas y retire el nodo de su grupo de destinos. Despues se drena.

    kubectl drain $NODO --ignore-daemonsets --delete-emptydir-data --force

Al terminar el mantenimiento se reincorpora.

    kubectl uncordon $NODO

La prueba completa, con medicion de trafico durante el proceso, esta en pruebas/perdida-de-nodo.sh.

## Diagnostico cuando algo no levanta

Si una aplicacion no llega a Synced, lo primero es leer por que.

    kubectl -n argocd get application NOMBRE -o jsonpath='{.status.operationState.message}'

Si los pods quedan en CreateContainerConfigError, falta algun Secret, lo que casi siempre significa que la llave de sellado no se restauro. Se comprueba que exista una sola llave y que sea la restaurada.

    kubectl -n sealed-secrets get secrets -l sealedsecrets.bitnami.com/sealed-secrets-key

Si hay dos, el controlador genero una propia porque arranco antes que la restauracion. Se borra la generada y se reinicia el controlador.

Si los pods quedan en Pending, falta capacidad o direcciones. La cuota regional de direcciones IP en uso es de cuatro y los nodos privados consumen una sola entre todos gracias al enrutador de salida, de modo que el sintoma suele venir de otro proyecto del mismo usuario que las tenga tomadas.

    kubectl describe pod NOMBRE -n sa-p8 | tail -5
    gcloud compute addresses list --project softwareavanz

Si Velero reporta la ubicacion de respaldo como Unavailable, la causa habitual es que la cuenta de Google que suplanta no tiene permiso sobre el bucket o que la anotacion de la cuenta de servicio de Kubernetes se perdio.

    kubectl -n velero get backupstoragelocation respaldos -o jsonpath='{.status.message}'
    kubectl -n velero get sa velero -o yaml | grep gcp-service-account

Si Terraform se queda esperando el bloqueo del estado, hay otra ejecucion en curso o una que murio sin liberarlo. El mensaje de error indica quien lo tomo y cuando. Solo si se tiene certeza de que ninguna otra ejecucion esta activa se libera a la fuerza con el identificador que el propio mensaje muestra.

    terraform -chdir=P9/terraform force-unlock IDENTIFICADOR

## Apagado y encendido sin destruir

Para dejar de pagar por los nodos sin perder nada, se reduce el grupo de instancias a cero. No debe usarse el redimensionamiento del cluster, porque intenta drenar respetando los presupuestos de interrupcion y falla dejando nodos acordonados.

    gcloud compute instance-groups managed list --project softwareavanz
    gcloud compute instance-groups managed resize NOMBRE_DEL_GRUPO --size 0 \
      --zone us-central1-a --project softwareavanz

Para volver a encender se restituye el numero de nodos declarado en Terraform.

    gcloud container clusters resize sa-p9 --node-pool principal --num-nodes 3 \
      --zone us-central1-a --project softwareavanz

ArgoCD reconcilia solo cuando los nodos vuelven. Conviene comprobar que las aplicaciones regresan a Synced y Healthy antes de dar el sistema por disponible.

## Destruccion deliberada del entorno

Para ejecutar una prueba de recuperacion se destruye todo con Terraform. La operacion elimina el cluster, sus nodos, sus volumenes y su balanceador, y deja intactos los repositorios, el estado, la llave y los respaldos.

    terraform -chdir=P9/terraform destroy -auto-approve

Despues se reconstruye con bootstrap.sh y se restauran los datos siguiendo las secciones anteriores.
