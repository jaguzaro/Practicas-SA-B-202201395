output "ambientes" {
  value = { for nombre, ambiente in module.ambiente : nombre => ambiente.namespace }
}

output "cuentas_de_servicio" {
  value = module.ambiente["prod"].cuentas_de_servicio
}

output "cluster" {
  value = google_container_cluster.plataforma.name
}

output "credenciales" {
  description = "Comando para que un operador obtenga acceso al cluster recien creado"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.plataforma.name} --zone ${var.zona} --project ${var.proyecto}"
}
