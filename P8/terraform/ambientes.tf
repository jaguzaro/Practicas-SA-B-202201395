module "ambiente" {
  source   = "./modules/ambiente"
  for_each = var.ambientes

  namespace = each.value.namespace
  etiquetas = merge(local.etiquetas, { ambiente = each.key })
  servicios = var.servicios
  cuota     = each.value.cuota
  limites   = var.limites
}

moved {
  from = kubernetes_namespace_v1.plataforma
  to   = module.ambiente["prod"].kubernetes_namespace_v1.plataforma
}

moved {
  from = kubernetes_resource_quota_v1.plataforma
  to   = module.ambiente["prod"].kubernetes_resource_quota_v1.plataforma
}

moved {
  from = kubernetes_limit_range_v1.plataforma
  to   = module.ambiente["prod"].kubernetes_limit_range_v1.plataforma
}

moved {
  from = kubernetes_service_account_v1.servicio
  to   = module.ambiente["prod"].kubernetes_service_account_v1.servicio
}

moved {
  from = kubernetes_role_v1.servicio
  to   = module.ambiente["prod"].kubernetes_role_v1.servicio
}

moved {
  from = kubernetes_role_binding_v1.servicio
  to   = module.ambiente["prod"].kubernetes_role_binding_v1.servicio
}

moved {
  from = kubernetes_service_account_v1.cronjobs
  to   = module.ambiente["prod"].kubernetes_service_account_v1.cronjobs
}

moved {
  from = kubernetes_role_v1.cronjobs
  to   = module.ambiente["prod"].kubernetes_role_v1.cronjobs
}

moved {
  from = kubernetes_role_binding_v1.cronjobs
  to   = module.ambiente["prod"].kubernetes_role_binding_v1.cronjobs
}
