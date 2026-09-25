#!/usr/bin/env bash
set -euo pipefail

PROYECTO="${PROYECTO:-softwareavanz}"
ZONA="${ZONA:-us-central1-a}"
CLUSTER="${CLUSTER:-sa-p9}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF="$RAIZ/terraform"
BITACORA="$RAIZ/evidencias/reconstruccion.txt"

marca() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" | tee -a "$BITACORA"; }

mkdir -p "$RAIZ/evidencias"
: > "$BITACORA"

marca "inicio del bootstrap contra el proyecto $PROYECTO"

for herramienta in gcloud terraform kubectl; do
  command -v "$herramienta" >/dev/null || { echo "Falta $herramienta"; exit 1; }
done
gcloud auth application-default print-access-token >/dev/null 2>&1 \
  || { echo "Sin credenciales. Ejecute: gcloud auth application-default login"; exit 1; }

marca "terraform init contra el estado remoto"
terraform -chdir="$TF" init -input=false -no-color >/dev/null

marca "creacion del cluster y su grupo de nodos"
terraform -chdir="$TF" apply -input=false -auto-approve -no-color \
  -target=google_container_cluster.plataforma \
  -target=google_container_node_pool.principal >/dev/null

marca "cluster disponible, se obtienen credenciales"
gcloud container clusters get-credentials "$CLUSTER" --zone "$ZONA" --project "$PROYECTO" >/dev/null 2>&1

marca "namespaces, cuotas, RBAC, llave de secretos, ArgoCD y aplicacion raiz"
terraform -chdir="$TF" apply -input=false -auto-approve -no-color >/dev/null

marca "esperando a que ArgoCD sincronice la plataforma completa"
fin=$(( $(date +%s) + 1800 ))
while :; do
  total=$(kubectl get applications -n argocd --no-headers 2>/dev/null | wc -l | tr -d ' ')
  sanas=$(kubectl get applications -n argocd --no-headers \
            -o custom-columns='H:.status.health.status' 2>/dev/null | grep -c 'Healthy' || true)
  if [ "$total" -gt 0 ] && [ "$total" = "$sanas" ]; then
    marca "las $total aplicaciones estan Healthy"
    break
  fi
  [ "$(date +%s)" -gt "$fin" ] && { marca "tiempo agotado con $sanas de $total aplicaciones sanas"; break; }
  sleep 20
done

sincronizadas=$(kubectl get applications -n argocd --no-headers \
                  -o custom-columns='S:.status.sync.status' 2>/dev/null | grep -c 'Synced' || true)
marca "$sincronizadas de $total aplicaciones estan sincronizadas con el repositorio"

marca "se espera a que el gateway reciba direccion publica"
espera=$(( $(date +%s) + 300 ))
until IP=$(kubectl -n sa-p8 get svc gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null); [ -n "$IP" ]; do
  [ "$(date +%s)" -gt "$espera" ] && break
  sleep 10
done
if [ -n "${IP:-}" ]; then
  marca "gateway disponible en $IP"
  codigo=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://$IP:8000/transactions/batches" || echo 000)
  marca "la plataforma responde a una peticion de negocio con codigo $codigo"
fi

marca "fin del bootstrap"
echo
kubectl get applications -n argocd -o custom-columns='APP:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status' | sort | tee -a "$BITACORA"
echo
echo "Bitacora con marcas de tiempo: $BITACORA"
