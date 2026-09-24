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

variable "ambientes" {
  description = "Ambientes de la plataforma, cada uno con su namespace y su cuota total de recursos"
  type = map(object({
    namespace = string
    cuota = object({
      requests_cpu    = string
      requests_memory = string
      limits_cpu      = string
      limits_memory   = string
      pods            = string
    })
  }))
  default = {
    prod = {
      namespace = "sa-p8"
      cuota = {
        requests_cpu    = "8"
        requests_memory = "10Gi"
        limits_cpu      = "32"
        limits_memory   = "24Gi"
        pods            = "60"
      }
    }
    dev = {
      namespace = "sa-p8-dev"
      cuota = {
        requests_cpu    = "2"
        requests_memory = "4Gi"
        limits_cpu      = "8"
        limits_memory   = "8Gi"
        pods            = "30"
      }
    }
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

variable "proyecto" {
  description = "Proyecto de Google Cloud donde vive la plataforma"
  type        = string
  default     = "softwareavanz"
}

variable "zona" {
  description = "Zona del cluster, zonal para que el plano de control no tenga costo"
  type        = string
  default     = "us-central1-a"
}

variable "region" {
  description = "Region donde vive la salida a internet de los nodos"
  type        = string
  default     = "us-central1"
}

variable "cluster" {
  description = "Nombre del cluster de Kubernetes"
  type        = string
  default     = "sa-p9"
}

variable "nodos" {
  description = "Dimensionamiento del grupo de nodos"
  type = object({
    cantidad = number
    tipo     = string
    discoGb  = number
  })
  default = {
    cantidad = 3
    tipo     = "e2-standard-2"
    discoGb  = 50
  }
}

variable "bucketRespaldos" {
  description = "Bucket donde viven la llave de sellado y los respaldos de Velero"
  type        = string
  default     = "softwareavanz-respaldos"
}
