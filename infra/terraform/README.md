# Terraform Placeholder

Production infrastructure is expected to provision:

- PostgreSQL with pgvector.
- Redis or Valkey.
- Private S3-compatible document bucket.
- API and worker services.
- Web deployment.
- Provider secrets.
- Observability sinks and alerts.

The local MVP keeps provider behavior mockable while preserving the production seams.
