resource "kubernetes_namespace_v1" "plataforma" {
  metadata {
    name   = var.namespace
    labels = local.etiquetas
  }
}
