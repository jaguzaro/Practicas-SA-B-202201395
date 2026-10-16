import { trace } from "@opentelemetry/api";

type Nivel = "info" | "warn" | "error";

export interface Registrador {
  info(mensaje: string, datos?: Record<string, unknown>): void;
  warn(mensaje: string, datos?: Record<string, unknown>): void;
  error(mensaje: string, datos?: Record<string, unknown>): void;
}

export function crearRegistrador(servicio: string): Registrador {
  const escribir = (nivel: Nivel, mensaje: string, datos?: Record<string, unknown>): void => {
    const contexto = trace.getActiveSpan()?.spanContext();
    const linea = {
      ts: new Date().toISOString(),
      level: nivel,
      service: servicio,
      msg: mensaje,
      trace_id: contexto?.traceId,
      span_id: contexto?.spanId,
      ...datos,
    };
    process.stdout.write(`${JSON.stringify(linea)}\n`);
  };

  return {
    info: (mensaje, datos) => escribir("info", mensaje, datos),
    warn: (mensaje, datos) => escribir("warn", mensaje, datos),
    error: (mensaje, datos) => escribir("error", mensaje, datos),
  };
}
