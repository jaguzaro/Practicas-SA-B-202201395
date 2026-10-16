import { obtenerMedidor } from "./otel.js";

export function crearSenalesDeNegocio(servicio: string) {
  const medidor = obtenerMedidor(servicio);

  return {
    sesionesIniciadas: medidor.createCounter("sesiones_iniciadas_total", {
      description: "Intentos de inicio de sesion segun su resultado",
    }),
    usuariosRegistrados: medidor.createCounter("usuarios_registrados_total", {
      description: "Usuarios dados de alta en la plataforma",
    }),
  };
}
