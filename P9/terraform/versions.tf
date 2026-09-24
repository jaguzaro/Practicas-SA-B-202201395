terraform {
  required_version = ">= 1.6"

  backend "gcs" {
    bucket = "softwareavanz-terraform-estado"
    prefix = "practica9"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.0"
    }
  }
}
