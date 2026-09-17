resource "kubernetes_resource_quota_v1" "plataforma" {
  metadata {
    name      = "sa-platform"
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = local.etiquetas
  }

  spec {
    hard = {
      "requests.cpu"    = var.cuota.requests_cpu
      "requests.memory" = var.cuota.requests_memory
      "limits.cpu"      = var.cuota.limits_cpu
      "limits.memory"   = var.cuota.limits_memory
      "pods"            = var.cuota.pods
    }
  }
}

resource "kubernetes_limit_range_v1" "plataforma" {
  metadata {
    name      = "sa-platform"
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = local.etiquetas
  }

  spec {
    limit {
      type = "Container"

      default = {
        cpu    = var.limites.default_limit_cpu
        memory = var.limites.default_limit_memory
      }

      default_request = {
        cpu    = var.limites.default_request_cpu
        memory = var.limites.default_request_memory
      }

      max = {
        cpu    = var.limites.max_cpu
        memory = var.limites.max_memory
      }
    }
  }
}
