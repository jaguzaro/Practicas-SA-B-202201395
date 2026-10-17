resource "helm_release" "aplicacion_raiz" {
  name       = "aplicacion-raiz"
  namespace  = kubernetes_namespace_v1.argocd.metadata[0].name
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argocd-apps"
  version    = "2.0.5"

  values = [yamlencode({
    applications = {
      plataforma = {
        namespace  = kubernetes_namespace_v1.argocd.metadata[0].name
        finalizers = ["resources-finalizer.argocd.argoproj.io"]
        project    = "default"
        source = {
          repoURL        = var.repositorio_gitops
          targetRevision = "main"
          path           = "apps"
          directory = {
            recurse = true
          }
        }
        destination = {
          server    = "https://kubernetes.default.svc"
          namespace = kubernetes_namespace_v1.argocd.metadata[0].name
        }
        syncPolicy = {
          automated = {
            prune    = true
            selfHeal = true
          }
        }
        ignoreDifferences = [
          {
            group        = "argoproj.io"
            kind         = "Application"
            jsonPointers = ["/metadata/finalizers"]
          }
        ]
      }
    }
  })]

  depends_on = [helm_release.argocd]
}
