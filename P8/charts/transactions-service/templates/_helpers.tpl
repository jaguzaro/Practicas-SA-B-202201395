{{- define "servicio.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
app.kubernetes.io/part-of: sa-platform
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end -}}

{{- define "servicio.imagen" -}}
{{- $repositorio := required "Debe indicar image.repository" .Values.image.repository -}}
{{- $tag := required "Debe indicar image.tag" .Values.image.tag | toString -}}
{{- if eq $tag "latest" -}}
{{- fail "La etiqueta latest esta prohibida, indique una version concreta en image.tag" -}}
{{- end -}}
{{- printf "%s:%s" $repositorio $tag -}}
{{- end -}}

{{- define "servicio.secreto" -}}
{{- .Values.secret.name | default (printf "%s-secret" .Chart.Name) -}}
{{- end -}}
