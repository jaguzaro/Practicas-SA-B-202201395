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

resource "kubernetes_namespace_v1" "argo_rollouts" {
  metadata {
    name   = "argo-rollouts"
    labels = local.etiquetas
  }
}

resource "helm_release" "argo_rollouts" {
  name       = "argo-rollouts"
  namespace  = kubernetes_namespace_v1.argo_rollouts.metadata[0].name
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-rollouts"
  version    = "2.43.1"
  values     = [file("${path.module}/values/argo-rollouts.yaml")]
  wait       = true
  timeout    = 300
}
