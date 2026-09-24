resource "kubernetes_namespace_v1" "argocd" {
  metadata {
    name   = "argocd"
    labels = local.etiquetas
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  namespace  = kubernetes_namespace_v1.argocd.metadata[0].name
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "10.9.1"
  values     = [file("${path.module}/values/argocd.yaml")]
  wait       = true
  timeout    = 600
}
