# Auth0 Integration Guide

This guide provides step-by-step instructions for implementing Auth0 authentication in TrossApp.

## 🎯 Overview

The TrossApp backend is designed with a clean authentication factory pattern that makes switching from development JWT authentication to Auth0 production authentication seamless.

### Current Status

- ✅ **Development Authentication**: Fully implemented with JWT tokens
- 🚧 **Auth0 Integration**: Ready-to-implement stubs and configuration
- 🔄 **Swappable Architecture**: Change `AUTH_MODE` environment variable to switch providers

## 📋 Prerequisites

1. Auth0 account (free tier available)
2. Node.js backend running TrossApp
3. Basic understanding of OAuth 2.0 flow

## 🚀 Implementation Steps

### Step 1: Auth0 Account Setup

1. **Create Auth0 Account**

   ```bash
   # Visit https://auth0.com and sign up
   # Create a new tenant for your application
   ```

2. **Create Application**
   - Go to Applications → Create Application
   - Choose "Regular Web Application"
   - Name: "TrossApp Backend"

3. **Configure Application Settings**

   ```
   Allowed Callback URLs:
   - http://localhost:3001/api/auth0/callback (development)
   - https://api.trossapp.com/api/auth0/callback (production)

   Allowed Logout URLs:
   - http://localhost:3001 (development)
   - https://trossapp.com (production)

   Allowed Web Origins:
   - http://localhost:3001 (development)
   - https://trossapp.com (production)
   ```

### Step 2: Environment Configuration

1. **Copy Environment Template**

   ```bash
   cp .env.auth0.template .env.auth0
   ```

2. **Fill in Auth0 Credentials**

   ```env
   AUTH0_DOMAIN=your-domain.auth0.com
   AUTH0_CLIENT_ID=your_client_id_here
   AUTH0_CLIENT_SECRET=your_client_secret_here
   AUTH0_AUDIENCE=https://api.trossapp.com
   AUTH0_CALLBACK_URL=http://localhost:3001/api/auth0/callback
   ```

3. **Update Main .env File**
   ```env
   # Add to your existing .env file
   AUTH_MODE=auth0
   ```

### Step 3: Install Dependencies

```bash
# Install Auth0 production dependencies
npm install auth0 jwks-rsa express-session connect-redis redis
```

### Step 4: Implement Auth0 Code

The backend already has comprehensive stubs ready for implementation. Uncomment the code sections marked with `/* FUTURE IMPLEMENTATION:` in:

1. **services/auth0-auth.js** - Core Auth0 authentication logic
2. **routes/auth0.js** - OAuth endpoints and callback handlers

### Step 5: User Roles Configuration

1. **Create Roles in Auth0**
   - Go to User Management → Roles
   - Create: admin, manager, dispatcher, technician, client

2. **Add Custom Claims Rule**
   ```javascript
   function (user, context, callback) {
     const namespace = 'https://trossapp.com/';
     context.idToken[namespace + 'role'] = user.app_metadata.role || 'technician';
     context.accessToken[namespace + 'role'] = user.app_metadata.role || 'technician';
     callback(null, user, context);
   }
   ```

### Step 6: Frontend Integration

Update your Flutter frontend to use Auth0 authentication:

```dart
// Replace development login with Auth0 login URL
final auth0LoginUrl = 'http://localhost:3001/api/auth0/login';

// Handle Auth0 callback in your web app
// The backend will redirect to your frontend after successful authentication
```

## 🧪 Testing

### Development Testing

```bash
# 1. Start backend with Auth0 mode
AUTH_MODE=auth0 npm start

# 2. Visit Auth0 login endpoint
curl http://localhost:3001/api/auth0/login

# 3. Complete OAuth flow in browser
```

### Production Deployment

```bash
# Update production environment variables
AUTH_MODE=auth0
AUTH0_DOMAIN=your-production-domain.auth0.com
AUTH0_CALLBACK_URL=https://api.trossapp.com/api/auth0/callback
```

## 🔧 Architecture Details

### Authentication Flow

```
1. User clicks "Login" → Frontend redirects to /api/auth0/login
2. Backend redirects to Auth0 authorization URL
3. User authenticates with Auth0
4. Auth0 redirects back to /api/auth0/callback with authorization code
5. Backend exchanges code for tokens
6. Backend creates user in database and generates internal JWT
7. Backend redirects to frontend with success
```

### Factory Pattern Benefits

```javascript
// Authentication is completely transparent to the rest of the application
const authProvider = AuthProvider.getInstance(); // Returns DevAuth or Auth0Auth
const result = await authProvider.authenticate(credentials);
```

### Database Integration

- Auth0 users are automatically created in local PostgreSQL database
- User roles and permissions remain in local database
- Auth0 handles authentication, local DB handles authorization

## 🔒 Security Features

- **CSRF Protection**: OAuth state parameter verification
- **JWT Verification**: Auth0 public key validation via JWKS
- **Secure Cookies**: HTTP-only, secure, same-site cookies
- **Token Refresh**: Automatic token refresh with refresh tokens
- **Session Management**: Redis-backed sessions for production

## 🚨 Troubleshooting

### Common Issues

1. **"Auth0 not configured" Error**
   - Verify all required environment variables are set
   - Check AUTH_MODE=auth0 is set

2. **Callback URL Mismatch**
   - Ensure Auth0 application callback URLs match your environment
   - Check AUTH0_CALLBACK_URL environment variable

3. **Token Verification Failed**
   - Verify AUTH0_DOMAIN and AUTH0_AUDIENCE are correct
   - Check Auth0 application settings

### Debug Mode

```bash
# Enable detailed Auth0 logging
DEBUG=auth0:* npm start
```

## 📚 Additional Resources

- [Auth0 Node.js Quickstart](https://auth0.com/docs/quickstart/backend/nodejs)
- [OAuth 2.0 Authorization Code Flow](https://auth0.com/docs/flows/authorization-code-flow)
- [Auth0 Custom Claims](https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims)

## 🔄 Rollback Plan

If you need to rollback to development authentication:

```bash
# Simply change the environment variable
AUTH_MODE=development

# Restart the backend - no code changes needed!
npm restart
```

The factory pattern ensures zero downtime switching between authentication providers.
