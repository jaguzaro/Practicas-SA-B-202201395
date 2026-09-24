provider "google" {
  project = var.proyecto
  zone    = var.zona
}

data "google_client_config" "actual" {}

provider "kubernetes" {
  host                   = "https://${google_container_cluster.plataforma.endpoint}"
  token                  = data.google_client_config.actual.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.plataforma.master_auth[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes = {
    host                   = "https://${google_container_cluster.plataforma.endpoint}"
    token                  = data.google_client_config.actual.access_token
    cluster_ca_certificate = base64decode(google_container_cluster.plataforma.master_auth[0].cluster_ca_certificate)
  }
}
