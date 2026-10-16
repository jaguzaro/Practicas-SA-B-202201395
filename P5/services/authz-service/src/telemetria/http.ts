import type { NextFunction, Request, Response } from "express";
import { SpanKind, SpanStatusCode, context, propagation, trace } from "@opentelemetry/api";
import type { Histogram, Counter } from "@opentelemetry/api";
import { obtenerMedidor, obtenerTrazador } from "./otel.js";
import type { Registrador } from "./registro.js";

export interface SenalesHttp {
  duracion: Histogram;
  peticiones: Counter;
}

export function crearSenalesHttp(servicio: string): SenalesHttp {
  const medidor = obtenerMedidor(servicio);
  return {
    duracion: medidor.createHistogram("http_server_duration_seconds", {
      description: "Duracion de las peticiones atendidas por el servicio",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      },
    }),
    peticiones: medidor.createCounter("http_server_requests_total", {
      description: "Peticiones atendidas por el servicio",
    }),
  };
}

function rutaDe(req: Request): string {
  const base = req.route?.path ?? req.path;
  return base.replace(/\/[0-9a-f-]{8,}/gi, "/:id").replace(/\/\d+/g, "/:id");
}

export function instrumentarHttp(servicio: string, registrador: Registrador) {
  const trazador = obtenerTrazador(servicio);
  const senales = crearSenalesHttp(servicio);

  return (req: Request, res: Response, next: NextFunction): void => {
    const contextoEntrante = propagation.extract(context.active(), req.headers);
    const span = trazador.startSpan(
      `${req.method} ${req.path}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          "http.request.method": req.method,
          "url.path": req.path,
          "server.address": req.hostname,
          "user_agent.original": req.get("user-agent") ?? "",
        },
      },
      contextoEntrante,
    );

    const inicio = process.hrtime.bigint();

    res.on("finish", () => {
      const segundos = Number(process.hrtime.bigint() - inicio) / 1e9;
      const ruta = rutaDe(req);
      const atributos = {
        servicio,
        metodo: req.method,
        ruta,
        codigo: String(res.statusCode),
        familia: `${Math.floor(res.statusCode / 100)}xx`,
      };

      senales.duracion.record(segundos, atributos);
      senales.peticiones.add(1, atributos);

      span.setAttribute("http.response.status_code", res.statusCode);
      span.setAttribute("http.route", ruta);
      if (res.statusCode >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `respuesta ${res.statusCode}` });
      }
      span.end();

      const nivel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      registrador[nivel]("peticion atendida", {
        http_method: req.method,
        http_route: ruta,
        http_status: res.statusCode,
        duration_ms: Math.round(segundos * 1000),
      });
    });

    context.with(trace.setSpan(contextoEntrante, span), () => next());
  };
}

export function cabecerasDeContexto(): Record<string, string> {
  const cabeceras: Record<string, string> = {};
  propagation.inject(context.active(), cabeceras);
  return cabeceras;
}
