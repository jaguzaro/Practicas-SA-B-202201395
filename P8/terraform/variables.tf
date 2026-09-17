variable "kubeconfig" {
  description = "Ruta al kubeconfig con acceso al cluster"
  type        = string
  default     = "~/.kube/config"
}

variable "contexto" {
  description = "Contexto de kubeconfig que apunta al cluster de GKE"
  type        = string
  default     = "gke_softwareavanz_us-central1-a_sa-p6"
}

variable "namespace" {
  description = "Namespace donde corre la plataforma"
  type        = string
  default     = "sa-p8"
}

variable "servicios" {
  description = "Microservicios de la plataforma y el ConfigMap que cada uno puede leer"
  type        = map(string)
  default = {
    auth-api             = "auth-api-config"
    authz-service        = "authz-service-config"
    transactions-service = "transactions-service-config"
    audit-service        = "audit-service-config"
    gateway              = "gateway-declarative"
  }
}

variable "cuota" {
  description = "Cuota total de recursos del namespace"
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    pods            = string
  })
  default = {
    requests_cpu    = "8"
    requests_memory = "10Gi"
    limits_cpu      = "32"
    limits_memory   = "24Gi"
    pods            = "60"
  }
}

variable "limites" {
  description = "Valores por defecto y maximos por contenedor"
  type = object({
    default_request_cpu    = string
    default_request_memory = string
    default_limit_cpu      = string
    default_limit_memory   = string
    max_cpu                = string
    max_memory             = string
  })
  default = {
    default_request_cpu    = "50m"
    default_request_memory = "64Mi"
    default_limit_cpu      = "300m"
    default_limit_memory   = "256Mi"
    max_cpu                = "2"
    max_memory             = "2Gi"
  }
}

variable "repositorio_gitops" {
  description = "URL publica del repositorio de manifiestos que observa ArgoCD"
  type        = string
  default     = "https://github.com/jaguzaro/Practicas-SA-B-202201395-gitops.git"
}

variable "repositorio_codigo" {
  description = "URL SSH del repositorio de codigo que contiene los charts"
  type        = string
  default     = "git@github.com:jaguzaro/Practicas-SA-B-202201395.git"
}

variable "llave_repositorio_codigo" {
  description = "Ruta a la llave privada de solo lectura registrada como deploy key en el repositorio de codigo"
  type        = string
  default     = "~/.ssh/argocd-practicas-sa"
}
