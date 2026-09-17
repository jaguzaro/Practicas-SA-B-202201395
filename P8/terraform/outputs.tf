output "ambientes" {
  value = { for nombre, ambiente in module.ambiente : nombre => ambiente.namespace }
}

output "cuentas_de_servicio" {
  value = module.ambiente["prod"].cuentas_de_servicio
}
