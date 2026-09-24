#!/usr/bin/env bash
set -euo pipefail

NS="${NS:-sa-p8}"
BASE="${BASE:-auditdb}"
TABLA="ejecuciones_cronjob"

clave() { kubectl -n "$NS" get secret datos-postgresql -o jsonpath='{.data.password}' | base64 -d; }
consulta() { kubectl -n "$NS" exec postgres-0 -- env PGPASSWORD="$(clave)" psql -U sa -d "$BASE" -tAc "$1"; }

case "${1:-resumen}" in
  resumen)
    echo "filas: $(consulta "select count(*) from $TABLA")"
    echo "ultima: $(consulta "select max(ejecutado_en) from $TABLA")"
    echo "carnes: $(consulta "select distinct carne from $TABLA")"
    ;;
  detalle)
    kubectl -n "$NS" exec postgres-0 -- env PGPASSWORD="$(clave)" psql -U sa -d "$BASE" \
      -c "select id, carne, ejecutado_en from $TABLA order by id desc limit ${2:-10}"
    ;;
  borrar)
    echo "filas antes: $(consulta "select count(*) from $TABLA")"
    consulta "truncate table $TABLA" >/dev/null
    echo "filas despues: $(consulta "select count(*) from $TABLA")"
    ;;
  *)
    echo "uso: $0 [resumen|detalle N|borrar]"; exit 1;;
esac
