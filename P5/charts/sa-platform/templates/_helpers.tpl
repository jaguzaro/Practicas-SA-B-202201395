{{- define "sa-platform.namespace" -}}
{{- .Values.global.namespace | default "sa-p5" -}}
{{- end -}}

{{- define "sa-platform.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
app.kubernetes.io/part-of: sa-platform
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
sa.practica: p5
{{- end -}}

{{- define "sa-platform.postgresHost" -}}
{{- .Values.global.postgresHost | default "postgres" -}}
{{- end -}}

{{- define "sa-platform.rabbitHost" -}}
{{- .Values.global.rabbitHost | default "rabbitmq" -}}
{{- end -}}

{{- define "sa-platform.databaseUrl" -}}
{{- $ctx := .ctx -}}
{{- $user := required "Debe indicar global.credentials.dbUser" $ctx.Values.global.credentials.dbUser -}}
{{- $password := required "Debe indicar global.credentials.dbPassword" $ctx.Values.global.credentials.dbPassword -}}
{{- printf "postgresql://%s:%s@%s:5432/%s" $user $password (include "sa-platform.postgresHost" $ctx) .database -}}
{{- end -}}

{{- define "sa-platform.brokerUrl" -}}
{{- $user := required "Debe indicar global.credentials.rabbitUser" .Values.global.credentials.rabbitUser -}}
{{- $password := required "Debe indicar global.credentials.rabbitPassword" .Values.global.credentials.rabbitPassword -}}
{{- printf "amqp://%s:%s@%s:5672/" $user $password (include "sa-platform.rabbitHost" .) -}}
{{- end -}}
