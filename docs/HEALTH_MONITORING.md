# Health Check & Monitoring Guide

Guide to monitoring TrossApp's health and responding to issues.

---

## Health Endpoints

### Backend Health Check

**Endpoint:** `GET /api/health`

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-21T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-21T10:30:00.000Z",
  "error": "Database connection failed"
}
```

**Platforms:**
- Railway: `https://trossapp-production.up.railway.app/api/health`
- Fly.io: `https://trossapp.fly.dev/api/health`
- AWS: `https://api.trossapp.com/api/health`
- Local: `http://localhost:3001/api/health`

---

## Monitoring Setup

### Railway (Current Platform)

**Built-in Monitoring:**
1. Go to Railway project dashboard
2. Click on backend service
3. View "Metrics" tab:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

**Health Check Configuration:**
Railway automatically checks `/api/health` every 30 seconds (configured in `railway.json`).

### Manual Health Checks

**Quick Check (Command Line):**
```bash
# Backend
curl https://trossapp-production.up.railway.app/api/health

# Frontend
curl https://trossapp.vercel.app

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s https://trossapp-production.up.railway.app/api/health
```

**Create `curl-format.txt`:**
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

---

## Alerting Setup (Optional)

### Option 1: Railway Webhooks

1. Go to Railway project settings
2. Add webhook URL (Slack, Discord, or custom)
3. Configure events:
   - Deployment failed
   - Service crashed
   - Health check failed

### Option 2: UptimeRobot (Free Tier)

**Setup:**
1. Sign up at https://uptimerobot.com
2. Create new monitor:
   - Type: HTTP(s)
   - URL: `https://trossapp-production.up.railway.app/api/health`
   - Interval: 5 minutes
3. Add alert contacts (email, SMS, Slack)
4. Repeat for frontend: `https://trossapp.vercel.app`

**Recommended Settings:**
- Monitor interval: 5 minutes
- Alert threshold: 2 consecutive failures
- Notification channels: Email + Slack

### Option 3: Better Uptime (Paid)

**Features:**
- Status page (public or private)
- Multi-location monitoring
- SSL certificate expiry alerts
- Integration with Railway/Vercel

---

## Key Metrics to Monitor

### Backend Performance

**Healthy Indicators:**
- Response time < 500ms (p95)
- CPU usage < 70%
- Memory usage < 80%
- Database connections < 80% of pool max

**Warning Signs:**
- Response time > 1000ms consistently
- CPU usage > 85%
- Memory usage > 90%
- Error rate > 1%

### Frontend Performance

**Healthy Indicators:**
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1
- Time to Interactive (TTI) < 3.5s

**Check via:**
- Vercel Analytics (built-in)
- Google PageSpeed Insights
- Lighthouse (Chrome DevTools)

### Database Health

**Monitor:**
- Active connections (via Railway dashboard)
- Query performance (slow query logs in backend)
- Storage usage (Railway PostgreSQL metrics)

**Warning Signs:**
- Connections near pool max (10 in default config)
- Slow queries > 1000ms frequently
- Storage > 80% capacity

---

## Automated Monitoring Scripts

### Backend Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

BACKEND_URL="https://trossapp-production.up.railway.app/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL)

if [ $RESPONSE -eq 200 ]; then
  echo "✅ Backend healthy"
  exit 0
else
  echo "❌ Backend unhealthy (HTTP $RESPONSE)"
  exit 1
fi
```

### Cron Job (Run every 5 minutes)

```bash
# Add to crontab: crontab -e
*/5 * * * * /path/to/scripts/health-check.sh || echo "Backend down!" | mail -s "TrossApp Alert" your@email.com
```

---

## Incident Response Checklist

### Backend Down

1. **Check health endpoint** - `curl https://[backend-url]/api/health`
2. **Check Railway logs** - Dashboard → Service → Logs
3. **Check database** - Railway → PostgreSQL → Metrics
4. **Common fixes:**
   - Restart service (Railway dashboard)
   - Check environment variables
   - Verify database connections
   - See [ROLLBACK.md](ROLLBACK.md) if deployment issue

### Frontend Down

1. **Check Vercel status** - https://vercel.com/status
2. **Check deployment logs** - Vercel dashboard → Deployments → Logs
3. **Common fixes:**
   - Redeploy from Vercel dashboard
   - Check build logs for errors
   - Verify vercel.json configuration

### Database Issues

1. **Check Railway PostgreSQL metrics**
2. **Review slow query logs** - `backend/logs/` (if enabled)
3. **Check connection pool** - May need to increase `DB_POOL_MAX`
4. **Restart database** - Railway dashboard (last resort)

---

## Log Monitoring

### Backend Logs

**Railway:**
```bash
# Via Railway CLI
railway logs

# Filter by service
railway logs -s backend

# Follow live
railway logs -f
```

**What to look for:**
- `❌` Error messages
- `⚠️` Warnings
- `🐌 Slow query` Performance issues
- Database connection errors

### Frontend Logs

**Vercel:**
1. Go to Vercel dashboard
2. Click deployment
3. View "Functions" or "Runtime Logs"

**Browser Console:**
- Check developer console for JS errors
- Monitor network tab for failed API calls

---

## Performance Baselines

**Established Benchmarks (as of 2025-11-21):**

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Backend Response Time (p95) | < 500ms | > 1000ms | > 2000ms |
| Database Query Time | < 100ms | > 500ms | > 1000ms |
| Frontend LCP | < 2.5s | > 3.5s | > 4.5s |
| API Error Rate | < 0.1% | > 1% | > 5% |
| Backend Uptime | 99.9% | < 99.5% | < 99% |

---

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
- [ROLLBACK.md](ROLLBACK.md) - Rollback procedures
- [CI_CD_GUIDE.md](CI_CD_GUIDE.md) - CI/CD pipeline

---

**Maintained by:** TrossApp Development Team  
**Last Updated:** 2025-11-21  
**Review Cycle:** Quarterly or after incidents

---

## Quick Start: UptimeRobot Setup

**Free tier monitoring (5-minute checks, email alerts)**

### 1. Create Account

1. Go to https://uptimerobot.com/signUp
2. Sign up with email
3. Verify email address

### 2. Add Backend Monitor

1. Click "Add New Monitor"
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** TrossApp API Health
   - **URL:** `https://tross-api-production.up.railway.app/api/health`
   - **Monitoring Interval:** 5 minutes
3. Click "Create Monitor"

### 3. Add Frontend Monitor

1. Click "Add New Monitor" again
2. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** TrossApp Frontend
   - **URL:** `https://trossapp.vercel.app`
   - **Monitoring Interval:** 5 minutes
3. Click "Create Monitor"

### 4. Configure Alerts

1. Go to "My Settings" → "Alert Contacts"
2. Add your email (auto-added on signup)
3. Enable "Email" notifications
4. Save

### 5. Test Alerts (Optional)

1. Go to a monitor
2. Click "Pause Monitoring"
3. Wait 5-10 minutes
4. Should receive "DOWN" alert email
5. Resume monitoring
6. Should receive "UP" alert email

### Dashboard

- View all monitors: https://uptimerobot.com/dashboard
- Mobile app available: iOS/Android
- Free tier: 50 monitors, 5-minute intervals

**That's it!** You'll get email alerts if either URL goes down.

---

