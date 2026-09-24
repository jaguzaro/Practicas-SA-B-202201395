resource "google_service_account" "velero" {
  account_id   = "velero-respaldos"
  display_name = "Cuenta que usa Velero para escribir los respaldos"
  project      = var.proyecto
}

resource "google_storage_bucket_iam_member" "velero" {
  bucket = var.bucketRespaldos
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.velero.email}"
}

resource "google_service_account_iam_member" "velero_identidad" {
  service_account_id = google_service_account.velero.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.proyecto}.svc.id.goog[velero/velero]"
}

output "cuenta_velero" {
  description = "Cuenta de servicio que Velero suplanta mediante Workload Identity"
  value       = google_service_account.velero.email
}
