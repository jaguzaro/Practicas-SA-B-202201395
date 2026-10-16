#!/usr/bin/env bash
set -uo pipefail

C="${C:---context=gke_softwareavanz_us-central1-a_sa-p9}"
NS="${NS:-sa-p8}"
DURACION="${DURACION:-600}"
PAUSA="${PAUSA:-1}"

IP=$(kubectl $C -n "$NS" get svc gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
[ -n "$IP" ] || { echo "el gateway no tiene direccion publica"; exit 1; }

TOKEN=$(curl -s -m 10 -X POST "http://$IP:8000/login" -H "Content-Type: application/json" \
  -d '{"correo":"carga@sa.local","password":"Observabilidad123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  curl -s -m 10 -o /dev/null -X POST "http://$IP:8000/register" -H "Content-Type: application/json" \
    -d '{"nombre":"Carga Observabilidad","correo":"carga@sa.local","password":"Observabilidad123!","rol":"admin"}'
  TOKEN=$(curl -s -m 10 -X POST "http://$IP:8000/login" -H "Content-Type: application/json" \
    -d '{"correo":"carga@sa.local","password":"Observabilidad123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")
fi

echo "generando trafico contra $IP durante $DURACION segundos"
inicio=$SECONDS
n=0
while [ $((SECONDS - inicio)) -lt "$DURACION" ]; do
  n=$((n + 1))
  curl -s -m 10 -o /dev/null -H "Authorization: Bearer $TOKEN" "http://$IP:8000/transactions/batches"
  curl -s -m 10 -o /dev/null -X POST "http://$IP:8000/transactions/batches" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"reference\":\"CARGA-$(date +%s)-$n\",\"transactions\":[{\"sourceAccount\":\"1234567890\",\"targetAccount\":\"0987654321\",\"beneficiary\":\"Carga\",\"amount\":$((RANDOM % 60000))}]}"
  curl -s -m 10 -o /dev/null "http://$IP:8000/me"
  curl -s -m 10 -o /dev/null -X POST "http://$IP:8000/authorize" -H "Content-Type: application/json" \
    -d "{\"token\":\"$TOKEN\",\"route\":\"transactions\"}"
  sleep "$PAUSA"
done
echo "se enviaron $((n * 4)) peticiones"
