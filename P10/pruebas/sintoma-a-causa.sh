#!/usr/bin/env bash
set -uo pipefail

C="${C:---context=gke_softwareavanz_us-central1-a_sa-p9}"
NS="${NS:-sa-p8}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SALIDA="$RAIZ/evidencias/sintoma-a-causa.txt"
mkdir -p "$(dirname "$SALIDA")"

marca() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" | tee -a "$SALIDA"; }
prom() { curl -s -m 15 -G "http://127.0.0.1:9090/api/v1/query" --data-urlencode "query=$1"; }
loki() { curl -s -m 15 -G "http://127.0.0.1:3100/loki/api/v1/query_range" --data-urlencode "query=$1" --data-urlencode "start=$2" --data-urlencode "end=$3" --data-urlencode "limit=20"; }

: > "$SALIDA"
echo "Recorrido del sintoma a la causa" >> "$SALIDA"
echo >> "$SALIDA"

T0=$(date +%s)
marca "PASO 1, la alerta. Se consulta que objetivo esta consumiendo presupuesto por encima de lo sostenible"
prom 'slo:disponibilidad:quema1h' | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d['data']['result']:
    print(f'            velocidad de consumo del presupuesto de disponibilidad: {float(r[\"value\"][1]):.1f} veces lo sostenible')" | tee -a "$SALIDA"

marca "PASO 2, que servicio falla. Se desagrega la tasa de error por servicio"
prom 'sum by (servicio) (rate(http_server_requests_total{namespace="sa-p8",familia="5xx"}[5m])) / clamp_min(sum by (servicio) (rate(http_server_requests_total{namespace="sa-p8"}[5m])), 0.001)' | python3 -c "
import sys,json
d=json.load(sys.stdin)
peor=None
for r in d['data']['result']:
    v=float(r['value'][1])
    print(f'            {r[\"metric\"][\"servicio\"]}: {v*100:.1f} por ciento de error')
    if peor is None or v>peor[1]: peor=(r['metric']['servicio'],v)
if peor: open('/tmp/servicio-culpable.txt','w').write(peor[0])" | tee -a "$SALIDA"
SERVICIO=$(cat /tmp/servicio-culpable.txt 2>/dev/null || echo transactions-service)
marca "            el servicio con mayor tasa de error es $SERVICIO"

marca "PASO 3, que operacion falla. Se desagrega por ruta y codigo"
prom "sum by (ruta, codigo) (rate(http_server_requests_total{namespace=\"sa-p8\",servicio=\"$SERVICIO\",familia=\"5xx\"}[5m]))" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d['data']['result']:
    print(f'            {r[\"metric\"].get(\"ruta\",\"?\")} responde {r[\"metric\"].get(\"codigo\",\"?\")}')" | tee -a "$SALIDA"

marca "PASO 4, que registro dejo el error. Se consulta el almacen de registros filtrando por servicio y nivel"
FIN=$(date -u +%s)000000000
INICIO=$(( $(date -u +%s) - 600 ))000000000
loki "{namespace=\"$NS\", servicio=\"$SERVICIO\", nivel=\"error\"}" "$INICIO" "$FIN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
vistos=set()
for s in d.get('data',{}).get('result',[]):
    for _,linea in s['values'][:4]:
        try:
            o=json.loads(linea)
        except Exception:
            continue
        clave=(o.get('msg'),o.get('http_route'))
        if clave in vistos: continue
        vistos.add(clave)
        print(f'            traza {o.get(\"trace_id\",\"?\")[:16]} ruta {o.get(\"http_route\",\"?\")} estado {o.get(\"http_status\",\"?\")} mensaje {o.get(\"msg\",\"?\")}')
        if o.get('error'): print(f'            causa: {o[\"error\"]}')
        if o.get('trace_id'): open('/tmp/traza.txt','w').write(o['trace_id'])" | tee -a "$SALIDA"

TRAZA=$(cat /tmp/traza.txt 2>/dev/null || echo "")
if [ -n "$TRAZA" ]; then
  marca "PASO 5, la traza completa. Se recupera del backend de trazas con el identificador que venia en el registro"
  curl -s -m 15 "http://127.0.0.1:3200/api/traces/$TRAZA" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for lote in d.get('batches',[]):
    nombre=[a['value'].get('stringValue') for a in lote['resource']['attributes'] if a['key']=='service.name']
    for ss in lote.get('scopeSpans',[]):
        for sp in ss.get('spans',[]):
            dur=(int(sp['endTimeUnixNano'])-int(sp['startTimeUnixNano']))/1e6
            print(f'            {nombre[0] if nombre else \"?\"} {sp[\"name\"]} {dur:.0f} ms')" 2>/dev/null | tee -a "$SALIDA" || echo "            traza $TRAZA" | tee -a "$SALIDA"
fi

T1=$(date +%s)
{
  echo
  echo "Tiempo del recorrido completo, de la alerta al registro de la causa: $(( T1 - T0 )) segundos"
  echo "Identificador de traza que une las tres senales: ${TRAZA:-no disponible}"
} | tee -a "$SALIDA"

echo
echo "Evidencia en $SALIDA"
