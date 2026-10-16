import { obtenerMedidor } from "./otel.js";

export function crearSenalesDeNegocio(servicio: string) {
  const medidor = obtenerMedidor(servicio);

  return {
    decisiones: medidor.createCounter("decisiones_autorizacion_total", {
      description: "Decisiones de autorizacion emitidas segun su resultado",
    }),
  };
}
