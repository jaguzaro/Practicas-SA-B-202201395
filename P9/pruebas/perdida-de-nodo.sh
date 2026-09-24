#!/usr/bin/env bash
set -uo pipefail

NS="${NS:-sa-p8}"
SALIDA="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/evidencias/perdida-de-nodo.txt"
mkdir -p "$(dirname "$SALIDA")"

IP=$(kubectl -n "$NS" get svc gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
[ -n "$IP" ] || { echo "El gateway no tiene direccion publica"; exit 1; }

NODO="${1:-$(kubectl -n "$NS" get pod -l app=auth-api -o jsonpath='{.items[0].spec.nodeName}')}"

{
  echo "Prueba de perdida de nodo"
  echo
  echo "Se drena $NODO mientras el gateway recibe una peticion por segundo"
  echo
  echo "Reparto de replicas antes del drenaje"
  kubectl -n "$NS" get pods -o custom-columns='POD:.metadata.name,NODO:.spec.nodeName,LISTO:.status.containerStatuses[0].ready' --no-headers | grep -v cronjob
  echo
} > "$SALIDA"

( ok=0; err=0; inicio=$SECONDS
  while [ $((SECONDS-inicio)) -lt 360 ]; do
    c=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://$IP:8000/transactions/batches")
    if [ "$c" = "401" ]; then ok=$((ok+1)); else err=$((err+1)); echo "$(date -u +%H:%M:%S) respuesta inesperada $c" >> "$SALIDA"; fi
    sleep 1
  done
  echo "$ok $err" > /tmp/trafico-nodo.txt
) &
TRAFICO=$!

sleep 5
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')  se acordona el nodo" | tee -a "$SALIDA"
kubectl cordon "$NODO" | tee -a "$SALIDA"

GW=$(kubectl -n "$NS" get pods -l app=gateway --field-selector "spec.nodeName=$NODO" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [ -n "$GW" ]; then
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')  se retira $GW para que el balanceador deje de enviar al nodo" | tee -a "$SALIDA"
  kubectl -n "$NS" delete pod "$GW" --wait=false >/dev/null
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')  espera de 75 segundos a que el balanceador converja" | tee -a "$SALIDA"
  sleep 75
fi

echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')  se drena el nodo" | tee -a "$SALIDA"
kubectl drain "$NODO" --ignore-daemonsets --delete-emptydir-data --force --timeout=240s 2>&1 | tail -5 | tee -a "$SALIDA"
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')  drenaje terminado" | tee -a "$SALIDA"

{
  echo
  echo "Reparto de replicas con el nodo fuera de servicio"
  kubectl -n "$NS" get pods -o custom-columns='POD:.metadata.name,NODO:.spec.nodeName,LISTO:.status.containerStatuses[0].ready' --no-headers | grep -v cronjob
  echo
  echo "Presupuestos de interrupcion"
  kubectl -n "$NS" get pdb --no-headers
} >> "$SALIDA"

wait $TRAFICO
read -r ok err < /tmp/trafico-nodo.txt
{
  echo
  echo "Trafico durante la prueba: $((ok+err)) peticiones, $ok con el codigo esperado, $err con otro"
  echo
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ')  se reincorpora el nodo"
} | tee -a "$SALIDA"
kubectl uncordon "$NODO" | tee -a "$SALIDA"

echo
echo "Evidencia en $SALIDA"
