# TrossApp Development Pipeline - Quick Guide

**For:** Non-technical team members, designers, stakeholders  
**Purpose:** Understand how code gets from development to production  
**Updated:** November 21, 2025

---

## The Big Picture (30 Second Version)

**You write code → Tests run automatically → Code goes live**

- **When you save code:** Tests run on your computer
- **When you push to GitHub:** Tests run in the cloud
- **When tests pass:** App deploys automatically to the internet

**That's it!** No manual deployment, no server management, just code and go.

---

## How Our Pipeline Works

### 1️⃣ Local Development (Your Computer)

**What you do:**
```
1. Make changes to code
2. Save files
3. Run: npm test (to check everything works)
4. Commit to git
5. Push to GitHub
```

**What happens automatically:**
- Tests run on your computer (1,736 backend tests + 1,550+ frontend tests)
- Code gets backed up to GitHub
- Your changes are safe!

**Tools:** VS Code, Git, Node.js, Flutter

---

### 2️⃣ Continuous Integration (GitHub Actions)

**What happens when you push code:**

```
GitHub sees new code
    ↓
Runs ALL tests automatically (3,400+ tests)
    ↓
Checks code quality (linting)
    ↓
Reports: ✅ Pass or ❌ Fail
```

**If tests PASS:** Code is ready to deploy  
**If tests FAIL:** GitHub tells you what broke (fix before deploying)

**Why this matters:** Catches bugs before users see them!

---

### 3️⃣ Automatic Deployment (Railway + Vercel)

**When you push to the `main` branch:**

#### Backend (API/Database) → Railway
```
GitHub → Railway detects new code
    ↓
Railway builds the backend
    ↓
Railway runs health checks
    ↓
Railway switches to new version (zero downtime!)
    ↓
Backend is LIVE: https://trossapp-production.up.railway.app
```

**Time:** ~2-3 minutes

#### Frontend (User Interface) → Vercel
```
GitHub → Vercel detects new code
    ↓
Vercel builds Flutter web app
    ↓
Vercel deploys to CDN (super fast globally)
    ↓
Frontend is LIVE: https://trossapp.vercel.app
```

**Time:** ~1-2 minutes

**Total deployment time:** ~5 minutes from push to live!

---

## Environments We Use

### 🧪 **Local** (Your Computer)
- **Purpose:** Development and testing
- **Who uses it:** Developers
- **Database:** Local PostgreSQL (test data)
- **Safety:** Can't break production

### 🔬 **Preview** (For Pull Requests)
- **Purpose:** Test changes before merging
- **Who uses it:** Anyone reviewing code
- **URLs:** Unique URL for each pull request
  - Frontend: `https://trossapp-pr-123.vercel.app`
  - Backend: Shared staging environment
- **Safety:** Isolated from production

### 🚀 **Production** (Live Users)
- **Purpose:** Real users, real data
- **Who uses it:** Everyone
- **URLs:**
  - Frontend: `https://trossapp.vercel.app`
  - Backend: `https://trossapp-production.up.railway.app`
- **Safety:** Protected by tests and review process

---

## What Each Platform Does

### GitHub (Version Control)
**What it is:** Backup for your code + collaboration hub  
**What it does:**
- Stores all code history
- Runs automated tests (GitHub Actions)
- Manages pull requests and code reviews
- Triggers deployments

**You interact with it:** Push code, create pull requests, review changes

---

### Railway (Backend Hosting)
**What it is:** Where the backend API and database live  
**What it does:**
- Runs Node.js server (handles API requests)
- Hosts PostgreSQL database (stores all data)
- Auto-deploys from GitHub
- Monitors health and performance

**You don't touch it:** Fully automatic after setup

**Dashboard:** https://railway.app (to view logs, metrics)

---

### Vercel (Frontend Hosting)
**What it is:** Where the Flutter web app lives  
**What it does:**
- Builds Flutter app into static files
- Distributes globally (CDN = super fast)
- Auto-deploys from GitHub
- Provides preview URLs for testing

**You don't touch it:** Fully automatic after setup

**Dashboard:** https://vercel.com (to view deployments, analytics)

---

## The Development Workflow (Step by Step)

### For New Features

```
1. Create a new branch
   git checkout -b feature/my-new-feature

2. Make your changes (code, design, whatever)

3. Test locally
   npm test

4. Commit and push
   git add .
   git commit -m "Add awesome new feature"
   git push origin feature/my-new-feature

5. Open Pull Request on GitHub
   - Tests run automatically
   - Vercel creates preview URL (test it!)
   - Request review from team

6. Get approval + merge to main
   - Automatically deploys to production
   - Takes ~5 minutes

7. Verify production
   - Check https://trossapp.vercel.app
   - Feature is live!
```

---

## For Designers/Non-Coders

### How to Test Your Designs

1. **Wait for Vercel preview URL** (appears in pull request comments)
2. **Click the link** (format: `https://trossapp-pr-123.vercel.app`)
3. **Test on your devices:**
   - Desktop browser
   - Mobile phone
   - Tablet
4. **Give feedback** in the pull request
5. **Once approved,** it goes to production automatically

**No code knowledge needed!** Just click, test, comment.

---

## Safety Features

### 🛡️ Multiple Layers of Protection

1. **Tests (3,400+ automated checks)**
   - Backend: 1,736 tests (API, database, security)
   - Frontend: 1,550+ tests (UI, components, forms)
   - E2E: 188 tests (full user workflows)

2. **Code Review**
   - At least one person reviews every change
   - No direct pushes to production

3. **Preview Environments**
   - Test changes before they go live
   - Isolated from real users

4. **Automatic Rollback**
   - If deployment fails health checks, Railway auto-reverts
   - Manual rollback takes 2 minutes (if needed)

5. **Monitoring**
   - Health checks every 30 seconds
   - Alerts if something breaks
   - Logs for debugging

---

## Common Questions

### "How do I deploy my changes?"

**Just push to the `main` branch.** That's it. Deployment is automatic.

```bash
git push origin main
```

Wait 5 minutes, check production. Done!

---

### "Can I test before deploying to production?"

**Yes! Two ways:**

1. **Preview URL** (for pull requests)
   - Vercel automatically creates `https://trossapp-pr-123.vercel.app`
   - Share this URL to test before merging

2. **Local testing**
   - Run `npm run dev` to test on your computer
   - Use `http://localhost:8080`

---

### "What if something breaks in production?"

**Rollback in 2 minutes:**

1. Go to Railway dashboard → Find last good deployment → Click "Redeploy"
2. Go to Vercel dashboard → Find last good deployment → Click "Promote to Production"

Done. Production is restored.

(See `docs/ROLLBACK.md` for details)

---

### "How do I know if my code is working?"

**GitHub tells you:**
- ✅ Green checkmark = All tests passed, ready to merge
- ❌ Red X = Tests failed, need to fix
- 🟡 Yellow dot = Tests running (wait)

Click the checkmark/X to see detailed results.

---

### "Where can I see logs/errors?"

**Railway (Backend):**
- Dashboard → Project → Backend → Logs
- See API requests, errors, database queries

**Vercel (Frontend):**
- Dashboard → Project → Deployment → Runtime Logs
- See build logs, function errors

**Local:**
- Terminal shows all logs when running `npm run dev`

---

## Platform Flexibility

### 🎯 Built for Portability

TrossApp is **platform-agnostic**. We can switch hosting providers without changing code:

**Current:**
- Backend: Railway
- Frontend: Vercel

**Could easily switch to:**
- Backend: AWS, Google Cloud, Fly.io, Render, Heroku
- Frontend: AWS Amplify, Netlify, Cloudflare Pages

**How?** Change environment variables. That's it. No code changes.

**Why this matters:** Never locked into one vendor. Always have options.

---

## Performance Targets

**What "good" looks like:**

| Metric | Target | Current |
|--------|--------|---------|
| Backend Response Time | < 500ms | ✅ ~200ms |
| Frontend Load Time | < 3s | ✅ ~1.8s |
| Test Suite Runtime | < 2 min | ✅ ~90s |
| Deployment Time | < 5 min | ✅ ~3 min |
| Uptime | > 99.5% | ✅ 99.9% |
| Zero-downtime Deploys | Yes | ✅ Yes |

---

## Quick Reference

### 📱 Important URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| **Production** | https://trossapp.vercel.app | https://trossapp-production.up.railway.app |
| **Health Check** | (loads app) | /api/health |
| **API Docs** | N/A | /api-docs |
| **Preview (PR #123)** | https://trossapp-pr-123.vercel.app | (shared staging) |

### 🔧 Common Commands

```bash
# Start local development
npm run dev

# Run all tests
npm test

# Check code quality
npm run lint

# Deploy (automatic via git push)
git push origin main
```

### 📊 Dashboards

- **GitHub:** https://github.com/losamgmt/tross-app
- **Railway:** https://railway.app
- **Vercel:** https://vercel.com/dashboard

---

## Need Help?

### For Development Issues
1. Check GitHub Actions (are tests passing?)
2. Check local logs (terminal output)
3. Ask in team chat

### For Deployment Issues
1. Check Railway dashboard (backend)
2. Check Vercel dashboard (frontend)
3. See `docs/ROLLBACK.md` for emergency procedures

### For Learning More
- `docs/CI_CD_GUIDE.md` - Technical CI/CD details
- `docs/DEPLOYMENT.md` - Deployment procedures
- `docs/HEALTH_MONITORING.md` - Monitoring setup

---

**The Bottom Line:**

Our pipeline is **automatic, safe, and fast**. You focus on building features. The pipeline handles testing, deployment, and monitoring. Just push code and go! 🚀

---

**Last Updated:** November 21, 2025  
**Maintained by:** TrossApp Development Team
