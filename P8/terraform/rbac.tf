resource "kubernetes_service_account_v1" "servicio" {
  for_each = var.servicios

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = merge(local.etiquetas, { app = each.key })
  }

  automount_service_account_token = false
}

resource "kubernetes_role_v1" "servicio" {
  for_each = var.servicios

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = merge(local.etiquetas, { app = each.key })
  }

  rule {
    api_groups     = [""]
    resources      = ["configmaps"]
    resource_names = [each.value]
    verbs          = ["get"]
  }
}

resource "kubernetes_role_binding_v1" "servicio" {
  for_each = var.servicios

  metadata {
    name      = each.key
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = merge(local.etiquetas, { app = each.key })
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.servicio[each.key].metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.servicio[each.key].metadata[0].name
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
  }
}

resource "kubernetes_service_account_v1" "cronjobs" {
  metadata {
    name      = "cronjobs"
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = merge(local.etiquetas, { app = "cronjobs" })
  }

  automount_service_account_token = false
}

resource "kubernetes_role_v1" "cronjobs" {
  metadata {
    name      = "cronjobs"
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = merge(local.etiquetas, { app = "cronjobs" })
  }

  rule {
    api_groups = ["batch"]
    resources  = ["jobs"]
    verbs      = ["get", "list"]
  }
}

resource "kubernetes_role_binding_v1" "cronjobs" {
  metadata {
    name      = "cronjobs"
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
    labels    = merge(local.etiquetas, { app = "cronjobs" })
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.cronjobs.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.cronjobs.metadata[0].name
    namespace = kubernetes_namespace_v1.plataforma.metadata[0].name
  }
}
