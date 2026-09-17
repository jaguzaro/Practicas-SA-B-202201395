resource "kubernetes_secret_v1" "repositorio_codigo" {
  metadata {
    name      = "repositorio-codigo"
    namespace = kubernetes_namespace_v1.argocd.metadata[0].name
    labels = merge(local.etiquetas, {
      "argocd.argoproj.io/secret-type" = "repository"
    })
  }

  data = {
    type          = "git"
    name          = "codigo"
    url           = var.repositorio_codigo
    sshPrivateKey = file(pathexpand(var.llave_repositorio_codigo))
  }

  depends_on = [helm_release.argocd]
}
