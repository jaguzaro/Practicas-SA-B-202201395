resource "kubernetes_namespace_v1" "sealed_secrets" {
  metadata {
    name   = "sealed-secrets"
    labels = local.etiquetas
  }
}

data "google_storage_bucket_object_content" "certificado_sellado" {
  bucket = var.bucketRespaldos
  name   = "llaves/sellado.crt"
}

data "google_storage_bucket_object_content" "llave_sellada" {
  bucket = var.bucketRespaldos
  name   = "llaves/sellado.key"
}

resource "kubernetes_secret_v1" "llave_sellada" {
  metadata {
    name      = "sealed-secrets-llave-restaurada"
    namespace = kubernetes_namespace_v1.sealed_secrets.metadata[0].name
    labels = merge(local.etiquetas, {
      "sealedsecrets.bitnami.com/sealed-secrets-key" = "active"
    })
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = data.google_storage_bucket_object_content.certificado_sellado.content
    "tls.key" = data.google_storage_bucket_object_content.llave_sellada.content
  }
}
