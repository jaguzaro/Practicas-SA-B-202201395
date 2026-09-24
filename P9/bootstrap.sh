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
            -o custom-columns='S:.status.sync.status,H:.status.health.status' 2>/dev/null \
          | grep -c 'Synced *Healthy' || true)
  if [ "$total" -gt 0 ] && [ "$total" = "$sanas" ]; then
    marca "las $total aplicaciones estan Synced y Healthy"
    break
  fi
  [ "$(date +%s)" -gt "$fin" ] && { marca "tiempo agotado con $sanas de $total aplicaciones sanas"; break; }
  sleep 20
done

marca "fin del bootstrap"
echo
kubectl get applications -n argocd -o custom-columns='APP:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status' | sort | tee -a "$BITACORA"
echo
echo "Bitacora con marcas de tiempo: $BITACORA"
