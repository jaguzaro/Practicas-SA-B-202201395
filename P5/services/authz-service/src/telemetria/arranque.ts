import { iniciarTelemetria } from "./otel.js";

iniciarTelemetria({
  servicio: process.env.OTEL_SERVICE_NAME ?? "authz-service",
  version: process.env.SERVICE_VERSION ?? "0.0.0",
  destinoTrazas: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://otel-collector.observabilidad:4318",
  puertoMetricas: Number(process.env.METRICS_PORT ?? 9464),
});
