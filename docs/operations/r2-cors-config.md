# Cloudflare R2 CORS Configuration

The R2 bucket requires CORS configuration to allow the frontend to directly fetch files (images, PDFs) for preview.

## Required CORS Rules

Add this configuration to your R2 bucket in Cloudflare Dashboard:

**Dashboard Path:** R2 → [bucket-name] → Settings → CORS Policy

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:8080",
      "http://localhost:3000",
      "https://trossapp.vercel.app",
      "https://*.vercel.app"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Why This Is Needed

When the Flutter web app loads images or PDFs directly from R2 signed URLs using:

- `Image.network(downloadUrl)` for images
- `<iframe src="downloadUrl">` for PDFs

The browser enforces CORS. Without the `Access-Control-Allow-Origin` header from R2, the browser blocks the request.

## Environments

| Environment     | Origins                                          |
| --------------- | ------------------------------------------------ |
| Local dev       | `http://localhost:8080`, `http://localhost:3000` |
| Production      | `https://trossapp.vercel.app`                    |
| Vercel previews | `https://*.vercel.app`                           |

## Troubleshooting

If you see this error in browser console:

```
Access to XMLHttpRequest at 'https://...r2.cloudflarestorage.com/...'
from origin 'http://localhost:8080' has been blocked by CORS policy
```

Check that:

1. CORS rules are configured on the R2 bucket
2. The origin matches one of the allowed origins
3. The method is GET or HEAD

---

## Railway Production Configuration

### Required Environment Variables

Set these in Railway dashboard for the backend service:

| Variable             | Description                | Example                                         |
| -------------------- | -------------------------- | ----------------------------------------------- |
| `STORAGE_PROVIDER`   | Storage provider type      | `r2`                                            |
| `STORAGE_ENDPOINT`   | R2 S3-compatible endpoint  | `https://<account-id>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET`     | R2 bucket name             | `tross-files`                                   |
| `STORAGE_ACCESS_KEY` | R2 API Token Access Key ID | `<your-access-key>`                             |
| `STORAGE_SECRET_KEY` | R2 API Token Secret        | `<your-secret-key>`                             |
| `STORAGE_REGION`     | R2 region (always 'auto')  | `auto`                                          |

### Getting R2 Credentials

1. Go to Cloudflare Dashboard → R2 → Overview
2. Click "Manage R2 API Tokens"
3. Create a new token with:
   - **Permissions:** Object Read & Write
   - **Specify bucket:** Your bucket name
4. Copy the Access Key ID and Secret Access Key

### Verifying Configuration

After setting env vars, restart the Railway service and check:

```bash
# Health check should show storage as configured
curl https://your-backend.railway.app/api/health

# Should return: { "storage": { "configured": true, ... } }
```

### Local Development

For local development, copy `.env.example` to `.env` and fill in your R2 credentials:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your R2 credentials
```
