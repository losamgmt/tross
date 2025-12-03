# TrossApp Development Scripts

Essential scripts for development workflow.

## Ì∫Ä Primary Scripts

**start-dev.bat** - Start complete dev environment (backend + frontend)
**stop-dev.bat** - Clean shutdown of all processes

## Ì¥ß Utilities

**check-ports.js** - Verify ports 3001, 8080 available
**kill-port.js** - Force-kill process on specific port

## Ì≥ã Prefer npm Scripts

```bash
npm run dev:backend        # Backend (localhost:3001)
npm run dev:frontend       # Frontend (localhost:8080)
npm test                   # All tests (616 passing)
```

## Ì∑ÇÔ∏è Backend Scripts

See `backend/scripts/`:
- `manual-curl-tests.sh` - API testing (10 tests)
- `run-migration.js` - Database migrations

**Status**: v1.0.0-backend-lock Ì¥í
