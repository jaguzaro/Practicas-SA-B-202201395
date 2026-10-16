import { obtenerMedidor } from "./otel.js";

export function crearSenalesDeNegocio(servicio: string) {
  const medidor = obtenerMedidor(servicio);

  return {
    lotesCreados: medidor.createCounter("lotes_creados_total", {
      description: "Lotes de transacciones aceptados y registrados",
    }),
    transaccionesRechazadas: medidor.createCounter("transacciones_rechazadas_total", {
      description: "Transacciones rechazadas por las reglas de validacion",
    }),
    montoProcesado: medidor.createCounter("monto_procesado_total", {
      description: "Monto acumulado de las transacciones validas",
    }),
  };
}
