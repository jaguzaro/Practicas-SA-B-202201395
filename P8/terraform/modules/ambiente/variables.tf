variable "namespace" {
  description = "Nombre del namespace del ambiente"
  type        = string
}

variable "etiquetas" {
  description = "Etiquetas comunes para todos los recursos del ambiente"
  type        = map(string)
}

variable "servicios" {
  description = "Microservicios de la plataforma y el ConfigMap que cada uno puede leer"
  type        = map(string)
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
}
