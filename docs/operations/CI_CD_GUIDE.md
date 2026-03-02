# CI/CD Documentation

Guide to Tross's continuous integration and deployment pipeline.

---

## Overview

**What runs automatically:**

- ✅ Backend tests (unit + integration)
- ✅ Frontend tests (Flutter analyze + test)
- ✅ Security audit (npm audit + dependency review)
- ✅ Web build verification
- ✅ Mobile builds (Android APK + iOS IPA)
- ✅ E2E smoke tests (against Railway production)

**When it runs:**

- Every push to `main` or `develop`
- Every pull request to `main`
- Mobile builds: Only on `main` branch pushes
- Triggered by GitHub Actions

**Automation:**

- 🤖 **Dependabot**: Weekly dependency updates (npm, Flutter, Docker, Actions)
- 👥 **CODEOWNERS**: Auto-assigns reviewers for PRs

---

## CI Pipeline Stages

### 1. Backend Unit Tests 🧪

**What runs:**

- Unit tests (fast, isolated, mocked dependencies)
- ESLint code quality checks

**Environment:** Node.js 22, no database

**Required to pass:** ✅ All tests must pass

### 2. Backend Integration Tests 🔗

**What runs:**

- Integration tests (real database, API endpoints)
- PostgreSQL 15 service container

**Environment:** Node.js 22, PostgreSQL 15, R2 credentials

**Required to pass:** ✅ All tests must pass

### 3. Security Audit 🔒

**What runs:**

- `npm audit --audit-level=high`
- Dependency review (PRs only) - blocks high-severity vulnerabilities

**Required to pass:** ⚠️ Warnings allowed, high-severity blocks PRs

### 4. Frontend Tests 🎨

**What runs:**

- `flutter analyze` (static analysis)
- `flutter test` (all widget + unit tests)

**Environment:** Flutter 3.38.7

**Required to pass:** ✅ All tests must pass

### 5. Web Build 🌐

**What runs:**

- `flutter build web --no-tree-shake-icons`
- Uploads artifact (main branch only)

**Required to pass:** ✅ Build must succeed

### 6. Mobile Builds 📱 (main branch only)

**Android 🤖:**

- Builds debug + release APKs
- Uploads as artifacts (30-day retention)

**iOS 🍎:**

- Builds unsigned IPA (macOS runner)
- Creates Payload zip for testing
- Uploads as artifact (30-day retention)

### 7. E2E Smoke Tests 🎭

**What runs:**

- Playwright tests against Railway production
- Health checks, security headers, routing

---

## E2E Testing Strategy

**E2E tests verify production is up and secure** - they run against the real Railway deployment, not a CI simulation.

### Why This Approach?

| Approach                  | Problem                                                      |
| ------------------------- | ------------------------------------------------------------ |
| ❌ Simulate Railway in CI | Complex DB setup, env var juggling, tests a mock not reality |
| ✅ Test real deployment   | Simple, tests what users actually experience                 |

### What E2E Tests Verify

- **Health:** Server running, DB connected, memory healthy
- **Security:** Auth required, invalid tokens rejected, headers present
- **Routing:** Unknown routes return 404
- **Files:** All file endpoints require auth

### What's NOT in E2E

Tests requiring authentication are in **integration tests** where test auth is enabled. Production doesn't accept dev tokens (correct security!).

### CI Pipeline Flow

```
Push to main
    ├─► Backend Unit ─────────────────┐
    │                                  │
    ├─► Backend Integration ───────────┼─► E2E Smoke ─┐
    │                                  │              │
    ├─► Security Audit ────────────────┤              │
    │                                  │              │
    ├─► Frontend Tests ─┬─► Web Build ─┤              ├─► Summary
    │                   │              │              │
    │                   ├─► Android ───┼──────────────┤
    │                   │              │              │
    │                   └─► iOS ───────┘──────────────┘
    │
    └─► Railway/Vercel auto-deploy (parallel)
```

**Concurrency:** In-progress runs are cancelled when a new push occurs (saves resources).

E2E waits for Railway to be healthy, then runs against the production URL.

### Required GitHub Secrets

| Secret        | Value                     | Example                              |
| ------------- | ------------------------- | ------------------------------------ |
| `BACKEND_URL` | Your production backend URL | `https://<your-app>.up.railway.app` |

### Running Tests

```bash
# Full test suite (local)
npm run test:all

# E2E against local backend
npm run test:e2e

# E2E against production (set BACKEND_URL)
BACKEND_URL=<your-backend-url> npm run test:e2e
```

---

## Fork PR Workflow

**For Collaborators (working in forks):**

### What They Do:

1. **Fork repo** to their GitHub account
2. **Clone their fork** locally
3. **Create feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```
4. **Make changes** and commit
5. **Push to their fork**:
   ```bash
   git push origin feature/my-feature
   ```
6. **Create PR** from fork to `losamgmt/tross:main`

### What Happens Automatically:

1. **GitHub Actions triggers** on PR
2. **CI runs** backend tests, linting, build
3. **Status checks** appear on PR (✅ or ❌)
4. **Vercel bot** comments with preview URL (once set up)
5. **PR is blocked from merge** if tests fail

### What You Do (Maintainer):

1. **Review PR** in GitHub
2. **Check CI status** (must be green ✅)
3. **Test preview deployment** (click Vercel URL)
4. **Run E2E locally** (see above)
5. **Review code** and request changes if needed
6. **Approve PR** if everything looks good
7. **Merge** (only you can merge - branch protection)

---

## Branch Protection Rules

**Status after setup (see `.github/BRANCH_PROTECTION_SETUP.md`):**

✅ `main` branch is protected:

- Requires PR (no direct pushes)
- Requires 1 approval (you)
- Requires CI to pass (all checks green)
- Requires branches up-to-date before merge
- Only you can merge

**This protects against:**

- Accidental direct commits to main
- Merging broken code
- Merging without review
- Your own mistakes (even you can't bypass)

---

## Deployment Pipeline

### Frontend (Vercel)

**Triggers:**

- Push to `main` → Deploy to production
- Open PR → Deploy to preview URL
- New commit to PR → Update preview

**Auto-deployment:**

```
PR opened → Vercel builds → Preview URL in comment
PR merged → Vercel builds → Production deploy
```

**Preview URLs:**

```
Production: <your-frontend-url>
Preview: <your-preview-url>
```

### Backend (Railway)

**Triggers:**

- Push to `main` → Deploy to production
- (Optional) Push to `develop` → Deploy to staging

**Auto-deployment:**

```
Push to main → Railway builds → Health check → Live
```

**Platform-Agnostic Configuration:**

Tross's backend uses `deployment-adapter.js` for zero-config deployment across platforms:

- **Railway** - Auto-detects via `RAILWAY_ENVIRONMENT`, uses `DATABASE_URL`
- **Render** - Auto-detects via `RENDER`, uses `DATABASE_URL`
- **Fly.io** - Auto-detects via `FLY_APP_NAME`, uses `DATABASE_URL`
- **Heroku** - Auto-detects via `DYNO`, uses `DATABASE_URL`
- **AWS/GCP** - Falls back to individual DB environment variables

**No code changes needed** when switching platforms—just set the appropriate environment variables.

**Railway Environment Variables Required:**

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...  # Auto-provided by Railway Postgres
JWT_SECRET=...
AUTH0_DOMAIN=...
AUTH0_AUDIENCE=...
AUTH0_ISSUER=...
FRONTEND_URL=<your-frontend-url>
```

Railway automatically provides `DATABASE_URL` when you provision a PostgreSQL database. The deployment adapter handles the rest.

**URLs:**

```
Production: <your-backend-url>
Health: <your-backend-url>/api/health
API Docs: <your-backend-url>/api-docs
```

---

## Monitoring & Debugging

### View CI Logs

**GitHub UI:**

1. Go to PR or commit
2. Click "Details" next to failed check
3. View logs for each step

**Failed tests:**

- Logs show exact test that failed
- Stack traces included
- Can re-run failed jobs

### Common CI Failures

**"npm ci failed"**

- Cause: package-lock.json out of sync with Node 22
- Fix: Run `npm install` locally, commit lock file

**"Tests failed"**

- Cause: Code breaks existing tests
- Fix: Run tests locally, fix broken functionality

**"Linting failed"**

- Cause: Code style violations
- Fix: Run `npm run lint -- --fix` locally

**"Build failed"**

- Cause: TypeScript errors, missing deps
- Fix: Run `npm run build` locally, fix errors

### Re-running CI

**If CI fails due to flaky test or infrastructure:**

1. Click "Re-run failed jobs" in GitHub Actions
2. Or push empty commit to trigger re-run:
   ```bash
   git commit --allow-empty -m "Trigger CI re-run"
   git push
   ```

---

## Cost & Usage

### GitHub Actions

**Free tier (PUBLIC REPO):**

- ✅ Unlimited minutes on all runners (ubuntu, macos, windows)
- ✅ No cost for iOS builds (macos-latest)

**Current usage:**

- ~3 minutes per PR (backend + frontend + security)
- ~4-5 minutes per main push (includes mobile builds with Gradle caching)
- **Cost: $0** (public repo) ✅

### Vercel

**Free tier:**

- Unlimited deployments
- 100GB bandwidth/month
- Commercial use restrictions

**Current usage:**

- ~10 deployments/day (PRs + main)
- <1GB bandwidth/month
- Free tier perfect for MVP ✅

### Railway

**Starter plan:**

- $5/month base
- ~$5-10/month usage (compute + DB)
- Total: ~$10-15/month

---

## Security Notes

**Secrets management:**

- GitHub Secrets for CI (`RAILWAY_BACKEND_URL`, R2 storage credentials)
- Railway environment variables for production
- Vercel environment variables for frontend
- **Never commit secrets to repo!**

**Fork PR security:**

- Secrets not exposed to fork PRs
- E2E only runs on `main` branch (requires `RAILWAY_BACKEND_URL` secret)
- Build and tests run in isolated environment

---

## Troubleshooting

**"CI stuck on waiting for PostgreSQL"**

- Usually times out after 30s
- Rare infrastructure issue
- Fix: Re-run jobs

**"E2E tests failing with connection refused"**

- Check `RAILWAY_BACKEND_URL` secret is set correctly
- Verify Railway deployment is healthy
- E2E waits up to 5 minutes for Railway to respond

**"Coverage upload failed"**

- Non-blocking (won't fail PR)
- Optional codecov.io integration
- Can ignore or configure token

**"Vercel deployment failed"**

- Check Vercel dashboard for logs
- Usually build command or env var issue
- Can redeploy manually from Vercel UI

---

**Keep this file updated as pipeline evolves!**
