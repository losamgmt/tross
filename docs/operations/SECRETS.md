# Secrets Configuration

Secrets are supplied as **environment variables** — never committed to the repository. They are configured in the deployment platform (Railway for the backend, Vercel for the frontend) and, where CI needs them, as GitHub Actions secrets.

## Required application secrets

The application requires (see [`backend/config/env-manifest.js`](../../backend/config/env-manifest.js) for the authoritative, current list):

- **JWT signing secret** — a strong random secret (minimum strength enforced at startup).
- **Auth0 credentials** — domain, client ID, and client secret for the production tenant.
- **Database connection** — provided by the platform (e.g. Railway's `DATABASE_URL`); see [DEPLOYMENT.md](DEPLOYMENT.md).
- **Frontend origin** — the production frontend URL for CORS.

## Notes

- Generate strong secrets (e.g. `openssl rand -base64 48`); never commit them.
- The env manifest is the source of truth for which variables are required and where.
- Add CI secrets in **GitHub → Settings → Secrets and variables → Actions**.
