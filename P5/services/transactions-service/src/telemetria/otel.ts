import { metrics, trace } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { propagation } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

export interface OpcionesTelemetria {
  servicio: string;
  version: string;
  destinoTrazas: string;
  puertoMetricas: number;
}

export function iniciarTelemetria(opciones: OpcionesTelemetria): void {
  const recurso = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: opciones.servicio,
    [ATTR_SERVICE_VERSION]: opciones.version,
    "deployment.environment": process.env.NODE_ENV ?? "production",
    "k8s.pod.name": process.env.POD_NAME ?? "",
    "k8s.namespace.name": process.env.POD_NAMESPACE ?? "",
  });

  const proveedorTrazas = new NodeTracerProvider({
    resource: recurso,
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: `${opciones.destinoTrazas}/v1/traces` })),
    ],
  });
  proveedorTrazas.register();
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());

  const proveedorMetricas = new MeterProvider({
    resource: recurso,
    readers: [new PrometheusExporter({ port: opciones.puertoMetricas, endpoint: "/metrics" })],
  });
  metrics.setGlobalMeterProvider(proveedorMetricas);

  const apagar = async (): Promise<void> => {
    await Promise.allSettled([proveedorTrazas.shutdown(), proveedorMetricas.shutdown()]);
    process.exit(0);
  };
  process.on("SIGTERM", apagar);
  process.on("SIGINT", apagar);
}

export function obtenerTrazador(servicio: string) {
  return trace.getTracer(servicio);
}

export function obtenerMedidor(servicio: string) {
  return metrics.getMeter(servicio);
}
