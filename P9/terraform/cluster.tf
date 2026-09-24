resource "google_compute_router" "salida" {
  name    = "${var.cluster}-router"
  region  = var.region
  network = "default"
  project = var.proyecto
}

resource "google_compute_router_nat" "salida" {
  name                               = "${var.cluster}-nat"
  router                             = google_compute_router.salida.name
  region                             = var.region
  project                            = var.proyecto
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

resource "google_container_cluster" "plataforma" {
  name     = var.cluster
  location = var.zona
  project  = var.proyecto

  remove_default_node_pool = true
  initial_node_count       = 1
  deletion_protection      = false

  workload_identity_config {
    workload_pool = "${var.proyecto}.svc.id.goog"
  }

  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {}

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  logging_service    = "none"
  monitoring_service = "none"

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }
}

resource "google_container_node_pool" "principal" {
  name     = "principal"
  cluster  = google_container_cluster.plataforma.name
  location = google_container_cluster.plataforma.location
  project  = var.proyecto

  node_count = var.nodos.cantidad

  management {
    auto_repair  = true
    auto_upgrade = false
  }

  depends_on = [google_compute_router_nat.salida]

  node_config {
    machine_type = var.nodos.tipo
    disk_size_gb = var.nodos.discoGb
    disk_type    = "pd-standard"
    image_type   = "COS_CONTAINERD"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      practica = "p9"
    }
  }
}
