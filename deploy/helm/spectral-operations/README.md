# Spectral Operations Helm Chart

Dual-deploy chart for sovereign cloud and on-prem/air-gapped installations.

## Install

```bash
helm install spectral ./deploy/helm/spectral-operations \
  --set ingress.host=spectral.defence.local \
  --set spectral.oidc.enabled=true \
  --set spectral.oidc.issuer=https://idp.example/realms/spectral \
  --set spectral.oidc.clientId=spectral-ops
```

## Air-gap notes

- Mount local terrain bundle PVC at `/data/terrain`
- Set `NEXT_PUBLIC_CESIUM_BASE_URL=/static/Cesium` — matches `copy-cesium-public.mjs` output (Cesium 1.116 chunk Workers, no bootstrapper)
- Provide `DATABASE_URL` via sealed secrets
- Disable external LLM; use local AeroCopilot adapter

## Components

| Service | Purpose |
|---------|---------|
| web | Next.js app + propagation API |
| postgres | Tenant data, audit, scenarios |
| redis | Propagation heatmap job queue |
| minio | Customer documents, 3D tiles |
