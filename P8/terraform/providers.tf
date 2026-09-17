provider "kubernetes" {
  config_path    = var.kubeconfig
  config_context = var.contexto
}

provider "helm" {
  kubernetes = {
    config_path    = var.kubeconfig
    config_context = var.contexto
  }
}
