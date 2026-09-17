output "namespace" {
  value = kubernetes_namespace_v1.plataforma.metadata[0].name
}

output "cuentas_de_servicio" {
  value = concat(
    [for sa in kubernetes_service_account_v1.servicio : sa.metadata[0].name],
    [kubernetes_service_account_v1.cronjobs.metadata[0].name]
  )
}
