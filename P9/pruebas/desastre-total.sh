#!/usr/bin/env bash
set -uo pipefail

NS="${NS:-sa-p8}"
CLUSTER="${CLUSTER:-sa-p9}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SALIDA="$RAIZ/evidencias/desastre-total.txt"
mkdir -p "$(dirname "$SALIDA")"

marca() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" | tee -a "$SALIDA"; }
aborta() { marca "ABORTADA: $1"; exit 1; }
hayRed() { gcloud container clusters list --project softwareavanz >/dev/null 2>&1; }
clave() { kubectl -n "$NS" get secret datos-postgresql -o jsonpath='{.data.password}' | base64 -d; }
consulta() { kubectl -n "$NS" exec postgres-0 -c postgresql -- env PGPASSWORD="$(clave)" psql -U sa -d auditdb -tAc "$1" 2>/dev/null | tr -d '\r'; }

: > "$SALIDA"
echo "Prueba de recuperacion ante desastre total" >> "$SALIDA"
echo >> "$SALIDA"

hayRed || aborta "no hay acceso a Google Cloud desde esta maquina"

RESPALDO="desastre-$(date -u +%Y%m%d-%H%M)"
marca "se toma el respaldo $RESPALDO antes del desastre"
velero backup create "$RESPALDO" --include-namespaces "$NS" --default-volumes-to-fs-backup --wait >/dev/null 2>&1
[ "$(kubectl -n velero get backup "$RESPALDO" -o jsonpath='{.status.phase}')" = "Completed" ] \
  || aborta "el respaldo previo no se completo, no se destruye nada"
marca "respaldo completado a las $(kubectl -n velero get backup "$RESPALDO" -o jsonpath='{.status.completionTimestamp}')"

FILAS_RESPALDO=$(consulta "select count(*) from ejecuciones_cronjob")
marca "filas registradas en el momento del respaldo: $FILAS_RESPALDO"

marca "la plataforma sigue operando y acumulando escrituras posteriores al respaldo"
sleep "${ESPERA:-300}"

FILAS_DESASTRE=$(consulta "select count(*) from ejecuciones_cronjob")
ULTIMA_DESASTRE=$(consulta "select max(ejecutado_en) from ejecuciones_cronjob")
marca "filas justo antes del desastre: $FILAS_DESASTRE, ultima escritura $ULTIMA_DESASTRE"

T0=$(date +%s)
marca "DESASTRE: se destruye el entorno completo con Terraform"
terraform -chdir="$RAIZ/terraform" destroy -auto-approve -no-color \
  -target=google_container_node_pool.principal \
  -target=google_container_cluster.plataforma >/dev/null 2>&1
hayRed || aborta "se perdio el acceso a Google Cloud durante la destruccion"
gcloud container clusters describe "$CLUSTER" --zone us-central1-a --project softwareavanz >/dev/null 2>&1 \
  && aborta "el cluster sigue existiendo, la destruccion no se completo"
marca "entorno destruido, no queda cluster, nodos, volumenes ni balanceador"
gcloud container clusters list --project softwareavanz --format="table(name,status)" 2>&1 | tee -a "$SALIDA"

marca "se limpia el estado de los recursos que vivian dentro del cluster destruido"
for recurso in $(terraform -chdir="$RAIZ/terraform" state list 2>/dev/null | grep -vE "google_container_cluster|google_container_node_pool|google_compute_router|google_service_account|google_storage_bucket_iam|google_service_account_iam"); do
  terraform -chdir="$RAIZ/terraform" state rm "$recurso" >/dev/null 2>&1
done

marca "RECONSTRUCCION: se ejecuta el punto de entrada unico"
"$RAIZ/bootstrap.sh" >/dev/null 2>&1 || aborta "el bootstrap fallo, revise evidencias/reconstruccion.txt"
cat "$RAIZ/evidencias/reconstruccion.txt" >> "$SALIDA"

marca "se restauran los datos desde $RESPALDO"
kubectl -n argocd patch application datos --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}' >/dev/null
kubectl -n "$NS" delete statefulset postgres --wait=true >/dev/null 2>&1
kubectl -n "$NS" delete pvc data-postgres-0 --wait=true >/dev/null 2>&1
RESTAURA="desde-desastre-$(date -u +%H%M%S)"
velero restore create "$RESTAURA" --from-backup "$RESPALDO" --include-namespaces "$NS" --wait >/dev/null 2>&1
marca "restauracion $RESTAURA en estado $(kubectl -n velero get restore "$RESTAURA" -o jsonpath='{.status.phase}')"

fin=$(( $(date +%s) + 900 ))
until [ "$(kubectl -n "$NS" get pod postgres-0 -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)" = "true" ]; do
  [ "$(date +%s)" -gt "$fin" ] && { marca "tiempo agotado esperando la base"; break; }
  sleep 10
done
kubectl -n argocd patch application datos --type merge -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}' >/dev/null

FILAS_RECUPERADAS=$(consulta "select count(*) from ejecuciones_cronjob")
marca "filas recuperadas: $FILAS_RECUPERADAS"

IP=$(kubectl -n "$NS" get svc gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
espera=$(( $(date +%s) + 300 ))
until [ -n "$IP" ]; do
  [ "$(date +%s)" -gt "$espera" ] && break
  sleep 10
  IP=$(kubectl -n "$NS" get svc gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
done
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "http://$IP:8000/transactions/batches" 2>/dev/null || echo 000)
T1=$(date +%s)
marca "la plataforma responde en $IP con codigo $CODIGO, el servicio esta restablecido"

{
  echo
  echo "Contenido recuperado"
  kubectl -n "$NS" exec postgres-0 -c postgresql -- env PGPASSWORD="$(clave)" psql -U sa -d auditdb \
    -c "select id, carne, ejecutado_en from ejecuciones_cronjob order by id desc limit 5" 2>/dev/null
  echo
  echo "Secretos descifrados con la llave restaurada"
  kubectl get sealedsecrets -A --no-headers | wc -l | tr -d ' ' | xargs echo "  secretos sellados sincronizados:"
  echo
  echo "Medicion"
  echo "  destruccion iniciada               $(date -u -r $T0 '+%Y-%m-%dT%H:%M:%SZ')"
  echo "  servicio restablecido              $(date -u -r $T1 '+%Y-%m-%dT%H:%M:%SZ')"
  echo "  tiempo de recuperacion real        $(( (T1 - T0) / 60 )) minutos con $(( (T1 - T0) % 60 )) segundos"
  echo "  filas al momento del respaldo      $FILAS_RESPALDO"
  echo "  filas justo antes del desastre     $FILAS_DESASTRE"
  echo "  filas recuperadas                  $FILAS_RECUPERADAS"
  echo "  filas perdidas                     $(( FILAS_DESASTRE - FILAS_RECUPERADAS ))"
  echo "  ultima escritura antes del desastre $ULTIMA_DESASTRE"
} | tee -a "$SALIDA"

echo
echo "Evidencia en $SALIDA"
