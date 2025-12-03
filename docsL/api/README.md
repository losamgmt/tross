# 📚 TrossApp API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001`  
**API Docs:** http://localhost:3001/api-docs  
**OpenAPI Spec:** [docs/api/openapi.json](./openapi.json)

---

## 🚀 Quick Start

### Import into Postman

1. Open Postman
2. Click **File** → **Import**
3. Select `docs/api/openapi.json`
4. Collection "TrossApp API" will be created with all endpoints

### Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📡 Endpoints Overview

### Public Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/callback` - Auth0 callback

### Authentication

- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update current user profile
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout from current session
- `POST /api/auth/logout-all` - Logout from all sessions
- `GET /api/auth/sessions` - Get active sessions

### Users (Admin Only)

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (soft delete)
- `PUT /api/users/:id/role` - Assign role to user

### Roles (Admin Only)

- `GET /api/roles` - List all roles
- `GET /api/roles/:id` - Get role by ID
- `GET /api/roles/:id/users` - Get users with this role
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

---

## 🔐 Authentication Flow

### 1. Development Mode (Default)

```bash
# Uses test users defined in backend/config/test-users.js
POST /api/dev-auth/login
{
  "email": "admin@trossapp.com",  # or client@trossapp.com
  "password": "admin123"           # or client123
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

### 2. Production Mode (Auth0)

```bash
# Redirect to Auth0 login
GET /api/auth0/login

# After Auth0 authentication, callback:
GET /api/auth0/callback?code=...&state=...

# Returns tokens and redirects to frontend
```

### 3. Using Tokens

```bash
# Include in all authenticated requests
Authorization: Bearer YOUR_ACCESS_TOKEN

# Refresh when expired
POST /api/auth/refresh
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

---

## 📋 Common Operations

### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer YOUR_TOKEN

Response:
{
  "id": 1,
  "email": "admin@trossapp.com",
  "first_name": "Admin",
  "last_name": "User",
  "role": "admin",
  "name": "Admin User"
}
```

### Update Profile

```bash
PUT /api/auth/me
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "first_name": "Updated",
  "last_name": "Name"
}
```

### List All Users (Admin)

```bash
GET /api/users
Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "admin@trossapp.com",
      "first_name": "Admin",
      "last_name": "User",
      "role_id": 1,
      "role_name": "admin",
      "created_at": "2025-10-17T...",
      "deleted_at": null
    }
  ],
  "count": 1,
  "timestamp": "2025-10-17T..."
}
```

### Create User (Admin)

```bash
POST /api/users
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "email": "newuser@example.com",
  "first_name": "New",
  "last_name": "User",
  "role_id": 2
}

Response:
{
  "success": true,
  "data": {
    "id": 3,
    "email": "newuser@example.com",
    ...
  },
  "message": "User created successfully"
}
```

### Assign Role (Admin)

```bash
PUT /api/users/3/role
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "role_id": 1
}

Response:
{
  "success": true,
  "data": {
    "userId": 3,
    "roleId": 1,
    "roleName": "admin"
  },
  "message": "Role assigned successfully"
}
```

### List All Roles (Admin)

```bash
GET /api/roles
Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "data": [
    { "id": 1, "name": "admin", "created_at": "..." },
    { "id": 5, "name": "client", "created_at": "..." }
  ],
  "count": 2
}
```

### Create Role (Admin)

```bash
POST /api/roles
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "manager"
}

Response:
{
  "success": true,
  "data": {
    "id": 6,
    "name": "manager",
    "created_at": "2025-10-17T..."
  },
  "message": "Role created successfully"
}
```

---

## ⚠️ Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid request parameters",
  "timestamp": "2025-10-17T..."
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "No token provided",
  "timestamp": "2025-10-17T..."
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Access denied. Admin role required.",
  "timestamp": "2025-10-17T..."
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "User not found",
  "timestamp": "2025-10-17T..."
}
```

### 409 Conflict

```json
{
  "success": false,
  "error": "Email already exists",
  "timestamp": "2025-10-17T..."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "An unexpected error occurred",
  "timestamp": "2025-10-17T..."
}
```

---

## 🔒 Security

### Rate Limiting

- **General endpoints:** 100 requests per 15 minutes per IP
- **Auth endpoints:** 5 login attempts per 15 minutes per IP
- Returns `429 Too Many Requests` when exceeded

### Protected Roles

- **admin** and **client** roles cannot be deleted
- **admin** and **client** roles cannot be modified
- Users assigned to a role cannot have that role deleted

### Token Security

- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens are revoked on logout
- Refresh token rotation on access token refresh

### Audit Logging

All admin operations are logged to `audit_logs` table:

- User creation/update/deletion
- Role assignment
- Role creation/update/deletion

---

## 🧪 Testing

### Development Mode

Use test users from `backend/config/test-users.js`:

**Admin User:**

- Email: `admin@trossapp.com`
- Password: `admin123`
- Role: admin

**Client User:**

- Email: `client@trossapp.com`
- Password: `client123`
- Role: client

### Test Endpoints

```bash
# Health check (always accessible)
curl http://localhost:3001/api/health

# Development login
curl -X POST http://localhost:3001/api/dev-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@trossapp.com","password":"admin123"}'

# Get profile (with token)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
  "timestamp": "2025-10-17T..."
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2025-10-17T..."
}
```

### Pagination (Future)

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## 🛠️ SDK Generation

Generate client SDKs using [OpenAPI Generator](https://openapi-generator.tech/):

```bash
# JavaScript/TypeScript
openapi-generator-cli generate -i docs/api/openapi.json -g typescript-axios -o clients/typescript

# Python
openapi-generator-cli generate -i docs/api/openapi.json -g python -o clients/python

# Java
openapi-generator-cli generate -i docs/api/openapi.json -g java -o clients/java
```

---

## 📚 Additional Resources

- **Swagger UI:** http://localhost:3001/api-docs (when server running)
- **OpenAPI Spec:** [docs/api/openapi.json](./openapi.json)
- **Testing Guide:** [docs/testing/TESTING_GUIDE.md](../testing/TESTING_GUIDE.md)
- **Auth Guide:** [docs/auth/AUTH_GUIDE.md](../auth/AUTH_GUIDE.md)

---

---

**TrossApp API Documentation** - RESTful API reference with comprehensive examples

