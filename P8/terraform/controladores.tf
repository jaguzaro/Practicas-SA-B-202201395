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

resource "kubernetes_namespace_v1" "sealed_secrets" {
  metadata {
    name   = "sealed-secrets"
    labels = local.etiquetas
  }
}

resource "helm_release" "sealed_secrets" {
  name       = "sealed-secrets"
  namespace  = kubernetes_namespace_v1.sealed_secrets.metadata[0].name
  repository = "https://bitnami.github.io/sealed-secrets"
  chart      = "sealed-secrets"
  version    = "2.20.0"
  values     = [file("${path.module}/values/sealed-secrets.yaml")]
  wait       = true
  timeout    = 300
}

resource "kubernetes_namespace_v1" "kyverno" {
  metadata {
    name   = "kyverno"
    labels = local.etiquetas
  }
}

resource "helm_release" "kyverno" {
  name       = "kyverno"
  namespace  = kubernetes_namespace_v1.kyverno.metadata[0].name
  repository = "https://kyverno.github.io/kyverno"
  chart      = "kyverno"
  version    = "3.9.1"
  values     = [file("${path.module}/values/kyverno.yaml")]
  wait       = true
  timeout    = 600
}
