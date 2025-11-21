# Vercel Deployment Guide

Complete guide to deploying TrossApp Flutter frontend to Vercel.

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Flutter installed locally (for testing build)
- Railway backend deployed and URL ready

---

## Initial Setup (One-Time)

### 1. Install Flutter SDK on Vercel

Vercel doesn't have Flutter by default. We need custom build configuration:

**Create `.vercel/install-flutter.sh`:**

Already handled in `vercel.json` with custom build command.

### 2. Connect to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select `losamgmt/tross-app`
4. Configure project:

   **Framework Preset:** Other  
   **Root Directory:** `frontend`  
   **Build Command:** (auto-detected from `vercel.json`)  
   **Output Directory:** `build/web`  
   **Install Command:** `flutter pub get`

5. Click "Deploy"

### 3. Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```bash
# Backend API URL (from Railway deployment)
BACKEND_URL=https://tross-api-production.up.railway.app
API_URL=https://tross-api-production.up.railway.app/api

# Auth0 Configuration (must match backend)
AUTH0_DOMAIN=dev-mglpuahc3cwf66wq.us.auth0.com
AUTH0_CLIENT_ID=<your-auth0-client-id>
AUTH0_AUDIENCE=https://api.trossapp.dev
AUTH0_REDIRECT_URI=https://trossapp.vercel.app/callback

# Environment
FLUTTER_ENV=production
```

**Important:** Add variables for all environments:
- Production
- Preview
- Development

### 4. Update Auth0 Configuration

In Auth0 dashboard (https://manage.auth0.com):

**Add Vercel URLs to Allowed Callback URLs:**
```
https://trossapp.vercel.app/callback
https://trossapp-*.vercel.app/callback
http://localhost:8080/callback
```

**Add to Allowed Logout URLs:**
```
https://trossapp.vercel.app
https://trossapp-*.vercel.app
http://localhost:8080
```

**Add to Allowed Web Origins:**
```
https://trossapp.vercel.app
https://trossapp-*.vercel.app
http://localhost:8080
```

### 5. Deploy!

First deployment happens automatically when you connect GitHub.

---

## Verify Deployment

### Check Production URL

```bash
# Vercel gives you URLs like:
# Production: https://trossapp.vercel.app
# Preview: https://trossapp-git-feature-branch.vercel.app

# Open in browser and test:
# 1. App loads
# 2. Auth0 login works
# 3. Backend API calls succeed
# 4. No console errors
```

### Test PR Preview

1. Create a test branch: `git checkout -b test/vercel-preview`
2. Make a small change (update README)
3. Push and create PR
4. Vercel auto-comments with preview URL
5. Click URL to test preview deployment

---

## Ongoing Usage

### Auto-Deploy on Push

**Production (main branch):**
```bash
git push origin main  # Auto-deploys to production URL
```

**Preview (PRs):**
```bash
git push origin feature/my-feature
# Create PR → Vercel deploys to preview URL
# Preview URL: https://trossapp-git-feature-my-feature.vercel.app
```

### Environment Variables

Update in Vercel dashboard:
- Project → Settings → Environment Variables
- Can set per-environment (Production, Preview, Development)
- Redeploy required to apply changes

### Build Logs

View in Vercel dashboard:
- Project → Deployments → Click deployment → "Building" → View logs

---

## PR Preview Workflow

**For Collaborators (Fork Users):**

1. Fork makes changes in their fork
2. Submit PR to your main repo
3. Vercel automatically:
   - Builds preview deployment
   - Comments on PR with URL
   - Updates preview on new commits
4. You review preview URL before merging
5. After merge → auto-deploys to production

**Example PR Comment from Vercel:**
```
✅ Preview deployment ready!

🔍 Inspect: https://vercel.com/losamgmt/trossapp/abc123
🌐 Preview: https://trossapp-pr-42.vercel.app

Latest commit: 1a2b3c4
```

---

## Custom Domain (Optional)

1. Vercel project → Settings → Domains
2. Add custom domain: `app.trossapp.com`
3. Add DNS records (Vercel shows you what to add):
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```
4. SSL certificate auto-generated
5. Vercel handles redirects (www → non-www, etc.)

---

## Performance Optimization

### Flutter Web Renderer

**Already configured in `vercel.json`:**
```bash
flutter build web --web-renderer canvaskit
```

**Why CanvasKit?**
- Better performance for complex UI
- Pixel-perfect rendering
- Trade-off: Larger initial bundle (~2MB more)

**Alternative (HTML renderer):**
```bash
flutter build web --web-renderer html
# Smaller bundle, less consistent rendering
```

### Caching

**Already configured in `vercel.json`:**
- Static assets: 1 year cache
- HTML: No cache (always fresh)
- Security headers: Added

---

## Troubleshooting

### Build Fails: "Flutter not found"

**Solution:** Ensure `vercel.json` has correct build command:
```json
{
  "buildCommand": "flutter build web --release --web-renderer canvaskit"
}
```

**If still fails:** Vercel may need Flutter installed. Use Vercel build image with Flutter or custom Docker image.

### App Loads but Can't Connect to Backend

**Check CORS:**
1. Verify Railway backend has `ALLOWED_ORIGINS` with Vercel URL
2. Test in browser console:
   ```javascript
   fetch('https://<railway-url>/api/health')
     .then(r => r.json())
     .then(console.log)
   ```

**Check environment variables:**
```bash
# In browser console (deployed app)
console.log(window.location.origin);  # Should match Auth0 allowed origins
```

### Auth0 Redirect Fails

**Common issue:** Callback URL not whitelisted

**Solution:**
1. Check Auth0 dashboard → Applications → Settings → Allowed Callback URLs
2. Ensure Vercel preview URLs pattern included:
   ```
   https://<your-app>-*.vercel.app/callback
   ```

### Preview Deployment Missing Environment Variables

**Solution:**
1. Vercel → Settings → Environment Variables
2. Ensure variables checked for "Preview" environment
3. Redeploy preview

---

## Rollback

If a deployment breaks production:

**Via Dashboard:**
1. Vercel → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

**Via CLI:**
```bash
vercel rollback <deployment-url>
```

---

## Integration with Railway

After both deployed, connect them:

### 1. Update Railway ALLOWED_ORIGINS

```bash
# In Railway environment variables
ALLOWED_ORIGINS=https://trossapp.vercel.app,https://trossapp-*.vercel.app,http://localhost:8080
```

### 2. Update Vercel BACKEND_URL

```bash
# In Vercel environment variables
BACKEND_URL=https://<your-railway-app>.up.railway.app
```

### 3. Test End-to-End

1. Open Vercel production URL
2. Click "Login with Auth0"
3. Verify redirect works
4. Check API calls succeed (Network tab)
5. Check no CORS errors (Console tab)

---

## Cost

**Vercel Pricing:**
- **Hobby Plan:** FREE
  - 100GB bandwidth/month
  - Unlimited deployments
  - PR previews included
  - Custom domains included
  - Perfect for MVP!

- **Pro Plan:** $20/month (only if you need more)
  - 1TB bandwidth
  - Advanced analytics
  - Commercial use allowed

**Expected cost:** $0/month for hobby project

---

## Next Steps

After Vercel is running:

1. ✅ Test login flow (Auth0 → Vercel → Railway → PostgreSQL)
2. ✅ Test CRUD operations
3. ✅ Share preview URLs with collaborators
4. ✅ Set up custom domain (optional)
5. ✅ Monitor Vercel Analytics (free)

---

**Keep this file for reference!**
