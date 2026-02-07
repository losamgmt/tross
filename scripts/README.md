# Tross Development Scripts

Essential scripts for development workflow.

> **Port configuration:** See [`config/ports.js`](../config/ports.js) for current port assignments.

## ��� Primary Scripts

**start-dev.bat** - Start complete dev environment (backend + frontend)
**stop-dev.bat** - Clean shutdown of all processes

## ��� Utilities

**check-ports.js** - Verify configured ports are available
**kill-port.js** - Force-kill process on specific port

## ��� Prefer npm Scripts

```bash
npm run dev:backend        # Backend
npm run dev:frontend       # Frontend
npm test                   # All tests
```

## ���️ Backend Scripts

See `backend/scripts/`:

- `manual-curl-tests.sh` - API testing
- `run-migration.js` - Database migrations
