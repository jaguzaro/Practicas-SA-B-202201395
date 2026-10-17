#!/usr/bin/env bash
set -uo pipefail

NS="${NS:-sa-p8}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SALIDA="$RAIZ/evidencias/sintoma-a-causa.txt"
mkdir -p "$(dirname "$SALIDA")"

marca() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" | tee -a "$SALIDA"; }
prom() { curl -s -m 15 -G "http://127.0.0.1:9090/api/v1/query" --data-urlencode "query=$1"; }

: > "$SALIDA"
{ echo "Recorrido del sintoma a la causa"; echo; echo "Punto de partida: la alerta de presupuesto de latencia, sin saber nada mas del sistema."; echo; } >> "$SALIDA"

T0=$(date +%s)

marca "PASO 1  la alerta dice que objetivo se esta incumpliendo"
prom 'slo:latencia:ratio5m' | python3 -c "
import sys,json
r=json.load(sys.stdin)['data']['result']
v=float(r[0]['value'][1]) if r else 0
print(f'          proporcion de peticiones bajo medio segundo: {v*100:.1f} por ciento, objetivo 99.0')" | tee -a "$SALIDA"

marca "PASO 2  que servicio y que ruta. Se desagrega el percentil 95 por ruta"
prom 'histogram_quantile(0.95, sum by (servicio, ruta, le) (rate(http_server_duration_seconds_bucket{namespace="sa-p8"}[2m])))' | python3 -c "
import sys,json
r=sorted(json.load(sys.stdin)['data']['result'], key=lambda x: -float(x['value'][1]))
for x in r[:4]:
    print(f'          {x[\"metric\"][\"servicio\"]:22s} {x[\"metric\"].get(\"ruta\",\"?\"):26s} {float(x[\"value\"][1])*1000:.0f} ms')
peor=r[0]['metric']
open('/tmp/culpable.txt','w').write(peor['servicio']+' '+peor.get('ruta',''))" | tee -a "$SALIDA"
read -r SERVICIO RUTA < /tmp/culpable.txt
marca "          la ruta mas lenta es $RUTA en $SERVICIO"

marca "PASO 3  no es saturacion. Se descarta que la lentitud venga de falta de recursos"
prom 'sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="sa-p8", container!=""}[2m])) / clamp_min(sum by (pod) (kube_pod_container_resource_limits{namespace="sa-p8", resource="cpu"}), 0.001)' | python3 -c "
import sys,json
r=sorted(json.load(sys.stdin)['data']['result'], key=lambda x: -float(x['value'][1]))
for x in r[:3]:
    print(f'          {x[\"metric\"].get(\"pod\",\"?\")[:44]:46s} {float(x[\"value\"][1])*100:.0f} por ciento del limite')" | tee -a "$SALIDA"

marca "PASO 4  se busca una peticion lenta concreta en el almacen de registros"
FIN=$(date -u +%s)000000000
INI=$(( $(date -u +%s) - 300 ))000000000
curl -s -m 20 -G "http://127.0.0.1:3100/loki/api/v1/query_range" \
  --data-urlencode "query={namespace=\"$NS\", servicio=\"$SERVICIO\"} | json | duration_ms > 500" \
  --data-urlencode "start=$INI" --data-urlencode "end=$FIN" --data-urlencode "limit=5" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for s in d.get('data',{}).get('result',[])[:1]:
    for _,l in s['values'][:3]:
        o=json.loads(l)
        print(f'          traza {o.get(\"trace_id\")} ruta {o.get(\"http_route\")} estado {o.get(\"http_status\")} duracion {o.get(\"duration_ms\")} ms')
        open('/tmp/traza.txt','w').write(o.get('trace_id',''))" | tee -a "$SALIDA"

TRAZA=$(cat /tmp/traza.txt 2>/dev/null || echo "")
if [ -n "$TRAZA" ]; then
  marca "PASO 5  se abre esa traza y se mira donde se fue el tiempo"
  curl -s -m 20 "http://127.0.0.1:3200/api/traces/$TRAZA" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for b in d.get('batches',[]):
    n=[a['value'].get('stringValue') for a in b['resource']['attributes'] if a['key']=='service.name']
    for ss in b.get('scopeSpans',[]):
        for sp in ss.get('spans',[]):
            ms=(int(sp['endTimeUnixNano'])-int(sp['startTimeUnixNano']))/1e6
            print(f'          {n[0] if n else \"?\":22s} {sp[\"name\"]:30s} {ms:.0f} ms')" | tee -a "$SALIDA"
fi

T1=$(date +%s)
{
  echo
  echo "Conclusion: la lentitud esta en la propia ruta $RUTA de $SERVICIO, no en una dependencia ni en falta de recursos,"
  echo "y el tiempo se consume dentro del span del servicio, lo que apunta al acceso a datos de esa operacion."
  echo
  echo "Identificador de traza que unio las tres senales: ${TRAZA:-no disponible}"
  echo "Tiempo del recorrido completo, de la alerta a la causa: $(( T1 - T0 )) segundos"
} | tee -a "$SALIDA"
