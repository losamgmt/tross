# Integration Foundation Architecture

**Status:** Phase 2 Implemented ✅  
**Date:** April 14, 2026  
**Scope:** Foundation extensions for QuickBooks + Stripe integrations

---

## Overview

This directory contains modular design documents for integration infrastructure. Each document is self-contained but designed to work compositionally.

## Document Index

| Document | Purpose | Dependencies |
|----------|---------|--------------|
| [01-webhook-validator.md](01-webhook-validator.md) | HMAC signature validation utility | None (leaf module) |
| [02-integration-credentials.md](02-integration-credentials.md) | OAuth token storage pattern | SystemSettingsService |
| [03-base-integration-service.md](03-base-integration-service.md) | External API client template | Credentials service |
| [04-sync-status-fields.md](04-sync-status-fields.md) | Metadata field definitions | Metadata SSOT |

---

## Architecture Principles

### 1. Follow Existing Patterns
Each module extends proven patterns already in the codebase:
- `StorageService` → External API client template
- `SystemSettingsService` → Credential storage
- `IdempotencyService` → Crypto utilities pattern
- Metadata SSOT → Field definitions

### 2. SRP Literalism
Each module has ONE responsibility:
- Webhook validator → Verify signatures (nothing else)
- Credentials service → Store/retrieve tokens (no refresh logic)
- Base service → HTTP client lifecycle (no business logic)
- Sync fields → Declare structure (derivation handles the rest)

### 3. Composition Over Inheritance
Services compose, not extend:
```
QuickBooksService
  ├── uses → SystemSettingsService (Module 02 token helpers)
  ├── uses → WebhookValidator (verify callbacks)
  └── uses → createIntegrationService factory (Module 03)
```

---

## Implementation Progress

```
Phase 0: Foundation ✅ COMPLETE (2026-04-09)
├── 01-webhook-validator.md     → utils/webhook-validator.js ✅
├── 02-integration-credentials.md → services/integrations/token-service.js ✅
├── 04-sync-status-fields.md    → Metadata + migration ✅
└── env-manifest.js             → 8 new env vars ✅

Phase 1: Services ✅ COMPLETE (2026-04-14)
└── 03-base-integration-service.md → Integration runner + providers
    ├── services/integrations/runner.js          ✅
    ├── services/integrations/providers/index.js ✅
    ├── services/integrations/providers/quickbooks.js ✅
    └── services/integrations/providers/stripe.js ✅

Phase 2: Routes & Webhooks ✅ COMPLETE (2026-04-14)
├── config/integration-providers.js  → SSOT for all provider metadata ✅
├── services/integrations/oauth-service.js → Generic OAuth2 flows ✅
├── routes/integrations.js           → Metadata-driven route factory ✅
├── routes/webhooks.js               → Signature-verified receivers ✅
├── config/integration-loader.js     → Dynamic route loading ✅
└── Health check in runner.js        → healthCheckAll() ✅

Phase 3: API Implementations (Next)
├── providers/quickbooks.js → Actual QuickBooks API calls
├── providers/stripe.js     → Actual Stripe API calls
└── Sync logic + event processing
```

---

## Dependency Graph

```
                        ┌───────────────────────────────────┐
                        │  config/integration-providers.js  │
                        │  (SSOT: OAuth, webhooks, caps)    │
                        └──────────────────┬────────────────┘
                                           │
        ┌──────────────────────────────────┼───────────────────────────────────┐
        │                                  │                                   │
        ▼                                  ▼                                   ▼
┌───────────────────┐           ┌─────────────────────┐           ┌────────────────────┐
│  services/        │           │  routes/            │           │  routes/           │
│  integrations/    │           │  integrations.js    │           │  webhooks.js       │
│  oauth-service.js │           │  (auto-gen routes)  │           │  (signature verify)│
└─────────┬─────────┘           └──────────┬──────────┘           └─────────┬──────────┘
          │                                │                                │
          ▼                                ▼                                ▼
┌─────────────────────┐         ┌─────────────────────┐          ┌─────────────────────┐
│  token-service.js   │         │  IntegrationRunner  │          │  WebhookValidator   │
│  (encrypted tokens) │         │  (runner.js)        │          │  (utils)            │
└─────────────────────┘         └──────────┬──────────┘          └─────────────────────┘
                                           │
                        ┌──────────────────┼───────────────────┐
                        │                  │                   │
                        ▼                  ▼                   ▼
              ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
              │ providers/      │  │ providers/      │  │ (future)        │
              │  quickbooks.js  │  │  stripe.js      │  │  xero.js etc.   │
              └─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Directory Structure (April 2026):**
```
config/
├── integration-providers.js   # SSOT for all provider metadata
└── integration-loader.js      # Dynamic route loading (mirrors route-loader.js)

services/integrations/
├── token-service.js          # OAuth token storage (encrypted)
├── runner.js                 # Base integration runner
├── oauth-service.js          # Generic OAuth2 flows (NEW)
├── index.js                  # Barrel exports
└── providers/
    ├── index.js              # Provider registry (uses metadata)
    ├── quickbooks.js         # QuickBooks implementation
    └── stripe.js             # Stripe implementation

routes/
├── integrations.js           # Integration management (auto-gen from metadata)
└── webhooks.js               # Webhook receivers (signature-verified)
```

---

## Cross-Cutting Concerns

### Error Handling
All modules use `AppError` with explicit status codes (no pattern matching).

### Logging
All modules use `logger` from `config/logger.js` with structured context.

### Testing
Each module designed for isolated unit testing:
- No database in webhook-validator tests
- Mocked DB in credentials tests
- Mocked HTTP in service tests

### Configuration
All env vars documented in `config/env-manifest.js` pattern:
- `QUICKBOOKS_*` variables
- `STRIPE_*` variables

---

## Files Created/Modified

### New Files
```
backend/utils/webhook-validator.js          # Module 01
backend/services/base-integration-service.js # Module 03
backend/services/quickbooks-service.js      # Uses Module 03 factory
backend/services/stripe-service.js          # Uses Module 03 factory
backend/routes/webhooks.js                  # Webhook receivers
```

### Modified Files
```
backend/services/system-settings-service.js # Module 02: Add token helpers
backend/config/models/invoice-metadata.js   # Module 04: Add QB sync fields
backend/config/models/payment-metadata.js   # Module 04: Add Stripe fields
backend/routes/health.js                    # Add integration health checks
backend/config/env-manifest.js              # Add integration env vars
backend/config/api-operations.js            # Add integration constants
```

---

## Success Criteria

- [ ] All modules pass Design Review Framework (3 perspectives)
- [ ] Zero new dependencies required
- [ ] Each module ≤ 150 lines of code
- [ ] 100% unit test coverage on foundation modules
- [ ] Existing tests continue to pass
