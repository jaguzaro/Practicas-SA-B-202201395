#!/usr/bin/env bash
set -uo pipefail

NS="${NS:-sa-p8}"
RESPALDO="${RESPALDO:-}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SALIDA="$RAIZ/evidencias/restauracion-de-datos.txt"
APP="datos"
mkdir -p "$(dirname "$SALIDA")"

marca() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" | tee -a "$SALIDA"; }
clave() { kubectl -n "$NS" get secret datos-postgresql -o jsonpath='{.data.password}' | base64 -d; }
consulta() { kubectl -n "$NS" exec postgres-0 -- env PGPASSWORD="$(clave)" psql -U sa -d auditdb -tAc "$1" 2>/dev/null | tr -d '\r'; }

: > "$SALIDA"
echo "Prueba de restauracion de datos" >> "$SALIDA"
echo >> "$SALIDA"

if [ -z "$RESPALDO" ]; then
  RESPALDO="restauracion-$(date -u +%H%M%S)"
  marca "se crea el respaldo $RESPALDO"
  velero backup create "$RESPALDO" --include-namespaces "$NS" --default-volumes-to-fs-backup --wait >/dev/null 2>&1
fi
FIN_RESPALDO=$(kubectl -n velero get backup "$RESPALDO" -o jsonpath='{.status.completionTimestamp}')
marca "respaldo $RESPALDO completado a las $FIN_RESPALDO"

FILAS_RESPALDO=$(consulta "select count(*) from ejecuciones_cronjob")
marca "filas en el momento del respaldo: $FILAS_RESPALDO"

marca "se deja correr la plataforma para que acumule datos posteriores al respaldo"
sleep "${ESPERA:-300}"

FILAS_DESASTRE=$(consulta "select count(*) from ejecuciones_cronjob")
ULTIMA=$(consulta "select max(ejecutado_en) from ejecuciones_cronjob")
marca "filas justo antes del desastre: $FILAS_DESASTRE, ultima escritura $ULTIMA"

marca "DESASTRE: se elimina la base de datos y su volumen"
kubectl -n argocd patch application "$APP" --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}' >/dev/null
kubectl -n "$NS" delete statefulset postgres --wait=true >/dev/null
kubectl -n "$NS" delete pvc data-postgres-0 --wait=true >/dev/null
marca "volumen eliminado, no queda dato alguno"

INICIO=$(date +%s)
RESTAURA="restauracion-$(date -u +%H%M%S)"
marca "se solicita la restauracion $RESTAURA desde $RESPALDO"
velero restore create "$RESTAURA" --from-backup "$RESPALDO" --include-namespaces "$NS" --wait >/dev/null 2>&1
marca "restauracion terminada con estado $(kubectl -n velero get restore "$RESTAURA" -o jsonpath='{.status.phase}')"

marca "se espera a que la base vuelva a aceptar conexiones"
fin=$(( $(date +%s) + 600 ))
until [ "$(kubectl -n "$NS" get pod postgres-0 -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)" = "true" ]; do
  [ "$(date +%s)" -gt "$fin" ] && { marca "tiempo agotado esperando a la base"; break; }
  sleep 10
done
FIN=$(date +%s)

FILAS_RESTAURADAS=$(consulta "select count(*) from ejecuciones_cronjob")
marca "filas recuperadas: $FILAS_RESTAURADAS"

kubectl -n argocd patch application "$APP" --type merge -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}' >/dev/null
marca "se devuelve la sincronizacion automatica a ArgoCD"

{
  echo
  echo "Contenido recuperado, primeras y ultimas filas"
  kubectl -n "$NS" exec postgres-0 -- env PGPASSWORD="$(clave)" psql -U sa -d auditdb \
    -c "select id, carne, ejecutado_en from ejecuciones_cronjob order by id limit 3"
  kubectl -n "$NS" exec postgres-0 -- env PGPASSWORD="$(clave)" psql -U sa -d auditdb \
    -c "select id, carne, ejecutado_en from ejecuciones_cronjob order by id desc limit 3"
  echo
  echo "Otras tablas del mismo volumen"
  kubectl -n "$NS" exec postgres-0 -- env PGPASSWORD="$(clave)" psql -U sa -d auditdb \
    -c "select service, count(*) from audit_events group by service"
  echo
  echo "Medicion"
  echo "  filas al momento del respaldo      $FILAS_RESPALDO"
  echo "  filas justo antes del desastre     $FILAS_DESASTRE"
  echo "  filas recuperadas                  $FILAS_RESTAURADAS"
  echo "  filas perdidas                     $(( FILAS_DESASTRE - FILAS_RESTAURADAS ))"
  echo "  tiempo de recuperacion de datos    $(( FIN - INICIO )) segundos"
} | tee -a "$SALIDA"

echo
echo "Evidencia en $SALIDA"
