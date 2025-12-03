# Authentication Documentation

TrossApp uses Auth0 for authentication with a multi-tier security model.

## Ì≥ö Documentation

### Core Guides

**[AUTH_GUIDE.md](AUTH_GUIDE.md)** ‚≠ê **Start Here**  
Comprehensive authentication and authorization guide covering:
- Auth0 configuration and setup
- Token management (JWT)
- Role-based access control (RBAC)
- Frontend and backend integration
- Development vs production flows

### Setup & Integration

**[AUTH0_SETUP.md](AUTH0_SETUP.md)**  
Auth0 tenant configuration steps

**[AUTH0_INTEGRATION.md](AUTH0_INTEGRATION.md)**  
OAuth2/OIDC implementation details and integration patterns

### Architecture

**[FLUTTER_AUTH_ARCHITECTURE.md](FLUTTER_AUTH_ARCHITECTURE.md)**  
Flutter-specific authentication architecture and patterns

**[GLOBAL_AUTH_STATE_SECURITY.md](GLOBAL_AUTH_STATE_SECURITY.md)**  
Global authentication state management and security layer

## Ì¥í Security Model

TrossApp implements **triple-tier security**:
1. **Frontend**: Permission-based UI guards
2. **Middleware**: Token validation and authorization
3. **API**: Database-level access control

See [AUTH_GUIDE.md](AUTH_GUIDE.md) for complete details.

## Ì∫Ä Quick Reference

**Development Mode:**
- Bypass auth with `DEV_MODE=true`
- Mock tokens for testing
- See [AUTH_GUIDE.md](AUTH_GUIDE.md#development-mode)

**Production Mode:**
- Auth0 OAuth2/OIDC flow
- JWT token validation
- Strict permission enforcement

---

**Related Documentation:**
- [Security Audits](../security/) - Security patterns and reviews
- [API Reference](../api/README.md) - API authentication requirements
