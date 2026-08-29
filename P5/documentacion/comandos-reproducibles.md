# Comandos reproducibles desde un cluster vacio


## Requisitos previos

Docker en ejecucion, y estas herramientas instaladas:

```bash
brew install minikube k6 helm@3
brew link --force helm@3
helm version --short
```

## Levantar el cluster

El plugin de red debe ser Calico. El CNI por defecto de minikube acepta las NetworkPolicies pero no las aplica, con lo cual el aislamiento de red seria falso.

```bash
minikube start --driver=docker --memory=4096 --cpus=4 --cni=calico
minikube addons enable ingress
minikube addons enable metrics-server
kubectl get nodes
```

## Construir las imagenes

```bash
docker build -t sa-auth-api:1.0.0             services/auth-api
docker build -t sa-authz-service:1.0.0        services/authz-service
docker build -t sa-transactions-service:1.1.0 services/transactions-service
docker build -t sa-audit-service:1.1.0        services/audit-service
docker build -t sa-cronjobs:1.0.0             scripts/cronjobs
```

El cluster no ve el daemon de Docker del host, asi que las imagenes se cargan explicitamente:

```bash
for i in sa-auth-api:1.0.0 sa-authz-service:1.0.0 sa-transactions-service:1.1.0 sa-audit-service:1.1.0 sa-cronjobs:1.0.0; do
  minikube image load $i
done
```

## Preparar las credenciales

El repositorio no contiene credenciales. Se parte del archivo de ejemplo:

```bash
cp charts/sa-platform/values.example.yaml charts/sa-platform/values-secrets.yaml
```

Editar `values-secrets.yaml` y reemplazar los valores ficticios. Las claves de `global.credentials` deben coincidir con las de `postgresql.auth` y `rabbitmq.auth`.

## Resolver las dependencias del chart

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update bitnami
helm dependency update charts/sa-platform
```

## Instalar la plataforma

Un solo comando levanta los cuatro microservicios, el gateway, la base de datos, el broker, los cronjobs y todas las politicas.

```bash
helm install sa-platform charts/sa-platform \
  -f charts/sa-platform/values-dev.yaml \
  -f charts/sa-platform/values-secrets.yaml
```

El namespace `sa-p5` lo crea el propio chart. Por eso el release se registra en `default`: Helm necesita un namespace existente para guardar sus metadatos antes de crear ninguno.

## Verificar que quedo arriba

```bash
kubectl get pods -n sa-p5 -w      # esperar a que los 7 esten Running
kubectl get svc,ingress,networkpolicy,hpa,cronjob -n sa-p5
helm list
```

## Probar la plataforma

Con el driver de Docker en macOS la IP de minikube no es alcanzable desde el host, asi que se abre un tunel:

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
```

En otra terminal:

```bash
curl -i -X POST http://localhost:8080/login -H "Host: sa-p5.local" \
  -H "Content-Type: application/json" -d '{"email":"demo@sa.test","password":"demo"}'
```

## Instalar en el ambiente de produccion

```bash
helm upgrade sa-platform charts/sa-platform \
  -f charts/sa-platform/values-prod.yaml \
  -f charts/sa-platform/values-secrets.yaml
```

Cambia replicas, limites de recursos, tag de imagen y nivel de log.

## Deshacer el cambio

```bash
helm history sa-platform
helm rollback sa-platform <numero-de-revision>
```

## Prueba de carga

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
BASE_URL=http://localhost:8080 k6 run scripts/carga/prueba-carga.js
```

Observando en paralelo:

```bash
kubectl get hpa -n sa-p5 -w
kubectl get pods -n sa-p5 -w
```

## Desmontar todo

```bash
helm uninstall sa-platform
kubectl delete namespace sa-p5
minikube delete
```
