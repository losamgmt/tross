# Quick Start

Get TrossApp running locally in under 5 minutes.

---

## Prerequisites

- **Node.js** v18+
- **Flutter** v3.x+
- **PostgreSQL** 14+ (or use Docker)
- **Git**

---

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/losamgmt/tross-app.git
cd tross-app
```

### 2. Install Dependencies
```bash
# Root (installs both frontend + backend)
npm install

# Frontend dependencies
cd frontend && flutter pub get && cd ..
```

### 3. Database Setup
```bash
# Option 1: Docker (recommended)
docker-compose up -d db

# Option 2: Local PostgreSQL
createdb trossapp_dev
createdb trossapp_test
```

### 4. Environment Configuration
```bash
# Backend
cd backend
cp .env.example .env

# Edit .env with your values:
# - DATABASE_URL
# - AUTH0_* (or use dev mode)
# - JWT_SECRET
```

### 5. Run Migrations
```bash
cd backend
npm run migrate
npm run seed  # Optional: adds test data
```

---

## Running the Application

### Development Mode

**Option 1: Automated (Windows)**
```bash
./scripts/start-dev.bat
```

**Option 2: Manual**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
flutter run -d chrome
```

### Access Points
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3001
- **API Docs:** http://localhost:3001/api-docs (Swagger)
- **Health Check:** http://localhost:3001/api/health

---

## Development Authentication

### Dev Mode (No Auth0 Required)
Backend automatically enables dev mode when `AUTH0_DOMAIN` is not configured.

**Test Users:** See `backend/config/test-users.js`
- Admin: `admin@dev.local`
- Manager: `manager@dev.local`
- Technician: `tech@dev.local`
- Customer: `customer@dev.local`

**Login:**
```bash
POST /api/dev-auth/login
{
  "email": "admin@dev.local"
}
```

### Production Mode (Auth0)
See [Auth Guide](AUTH.md) for Auth0 setup.

---

## Verification

### Run Tests
```bash
# Backend (1675+ tests)
cd backend
npm test

# Frontend
cd frontend
flutter test
```

### Check Health
```bash
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-19T...",
  "database": "connected"
}
```

---

## Common Issues

### Port Already in Use
```bash
# Check what's using port 3001
npx kill-port 3001

# Or use different port
PORT=3002 npm run dev
```

### Database Connection Failed
```bash
# Verify PostgreSQL is running
psql -l

# Check DATABASE_URL in .env
# Format: postgresql://user:password@localhost:5432/trossapp_dev
```

### Flutter Web Not Starting
```bash
# Clear cache and rebuild
cd frontend
flutter clean
flutter pub get
flutter run -d chrome
```

---

## Next Steps

- **[Development Workflow](DEVELOPMENT.md)** - Learn the daily dev process
- **[Architecture](ARCHITECTURE.md)** - Understand core patterns
- **[Testing Guide](TESTING.md)** - Write tests effectively
- **[API Documentation](API.md)** - Explore available endpoints

---

## Quick Reference

### Useful Commands
```bash
# Stop all services
./scripts/stop-dev.bat  # Windows
npm run stop            # Cross-platform

# Reset database
cd backend
npm run db:reset

# View logs
cd backend
tail -f logs/combined.log

# Run specific tests
cd backend
npm test -- customers  # Run customer tests only
```

### Project Structure
```
tross-app/
├── backend/           # Node.js API
│   ├── server.js      # Entry point
│   ├── routes/        # API endpoints
│   ├── db/models/     # Database models
│   └── __tests__/     # Jest tests
├── frontend/          # Flutter app
│   ├── lib/           # Source code
│   └── test/          # Flutter tests
├── docs/              # Documentation
└── scripts/           # Automation scripts
```
