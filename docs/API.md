# API Reference

RESTful API design patterns and conventions.

---

## API Philosophy

**Principles:**
- **RESTful** - Resources as nouns, actions as HTTP verbs
- **Consistent** - Same patterns across all endpoints
- **Self-documenting** - OpenAPI/Swagger for live docs
- **Versioned** - Future-proof with API versions
- **Secure** - Auth on everything except health checks

---

## Base URL

**Development:** `http://localhost:3001`  
**Production:** `https://api.trossapp.com`

**Live Documentation:** http://localhost:3001/api-docs (Swagger UI)

---

## Request/Response Patterns

### Standard Request
```http
POST /api/customers
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "phone": "+1234567890"
}
```

### Standard Response (Success)
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "id": 123,
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "phone": "+1234567890",
    "is_active": true,
    "created_at": "2025-11-19T10:30:00Z",
    "updated_at": "2025-11-19T10:30:00Z"
  }
}
```

### Standard Response (Error)
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "phone": "Phone must be 10-15 digits"
  },
  "timestamp": "2025-11-19T10:30:00Z"
}
```

---

## HTTP Status Codes

**Success:**
- `200 OK` - Request succeeded (GET, PUT, DELETE)
- `201 Created` - Resource created (POST)
- `204 No Content` - Success with no response body

**Client Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate resource (e.g., email already exists)
- `422 Unprocessable Entity` - Validation failed

**Server Errors:**
- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - Server temporarily unavailable

---

## Pagination

### Request
```http
GET /api/customers?page=1&limit=20&sort=name&order=asc
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Field to sort by (default: id)
- `order` - Sort order: `asc` or `desc` (default: asc)

### Response
```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Filtering

### Query Parameters
```http
GET /api/customers?status=active&search=acme
```

**Common Filters:**
- `search` - Text search across multiple fields
- `status` - Filter by status value
- `is_active` - Filter active/inactive (true/false)
- `created_after` - Filter by creation date (ISO 8601)

### Example
```http
GET /api/work_orders?status=pending&assigned_to=123&created_after=2025-01-01
```

---

## Authentication

**All endpoints require authentication except:**
- `GET /api/health`
- `POST /api/dev-auth/login` (dev mode)
- `POST /api/auth0/callback` (Auth0 callback)

### Bearer Token
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting a Token

**Dev Mode:**
```bash
POST /api/dev-auth/login
{
  "email": "admin@dev.local"
}
```

**Production (Auth0):**
```bash
# Redirect user to:
GET /api/auth0/login

# After Auth0 login, user redirected back with token
```

---

## Core Endpoints

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

### Users

**List Users** (Admin only)
```http
GET /api/users?page=1&limit=20
```

**Get User**
```http
GET /api/users/:id
```

**Create User** (Admin only)
```http
POST /api/users
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role_id": 2
}
```

**Update User**
```http
PUT /api/users/:id
{
  "first_name": "Jane",
  "last_name": "Smith"
}
```

**Delete User** (Soft delete)
```http
DELETE /api/users/:id
```

---

### Customers

**List Customers**
```http
GET /api/customers?page=1&limit=20&search=acme
```

**Get Customer**
```http
GET /api/customers/:id
```

**Create Customer**
```http
POST /api/customers
{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```

**Update Customer**
```http
PUT /api/customers/:id
{
  "name": "Acme Corporation",
  "phone": "+1234567899"
}
```

**Delete Customer** (Soft delete)
```http
DELETE /api/customers/:id
```

---

### Work Orders

**List Work Orders**
```http
GET /api/work_orders?status=pending&assigned_to=123
```

**Get Work Order**
```http
GET /api/work_orders/:id
```

**Create Work Order**
```http
POST /api/work_orders
{
  "customer_id": 123,
  "title": "Fix HVAC system",
  "description": "Air conditioner not cooling",
  "priority": 1,
  "status": "pending"
}
```

**Update Work Order**
```http
PUT /api/work_orders/:id
{
  "status": "in_progress",
  "assigned_to": 456
}
```

**Delete Work Order** (Soft delete)
```http
DELETE /api/work_orders/:id
```

---

## Error Handling

### Validation Errors
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Email is required",
    "phone": "Phone must be 10-15 digits"
  },
  "timestamp": "2025-11-19T10:30:00Z"
}
```

### Authentication Errors
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "timestamp": "2025-11-19T10:30:00Z"
}
```

### Permission Errors
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions for this action",
  "timestamp": "2025-11-19T10:30:00Z"
}
```

### Not Found Errors
```json
{
  "error": "Not Found",
  "message": "Customer with ID 999 not found",
  "timestamp": "2025-11-19T10:30:00Z"
}
```

---

## Rate Limiting

**Limits:**
- 100 requests per minute per IP
- 5 login attempts per 15 minutes

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

**Response when rate limited:**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60,
  "timestamp": "2025-11-19T10:30:00Z"
}
```

---

## CORS

**Allowed Origins:** `http://localhost:8080` (dev), `https://trossapp.vercel.app` (prod)  
**Allowed Methods:** GET, POST, PUT, DELETE  
**Allowed Headers:** Content-Type, Authorization  
**Credentials:** Supported

---

## OpenAPI/Swagger

**Interactive Documentation:** http://localhost:3001/api-docs

**Features:**
- Try endpoints directly in browser
- See request/response schemas
- View authentication requirements
- Download OpenAPI spec

**OpenAPI Spec:** http://localhost:3001/api-docs.json

---

## Versioning (Future)

When breaking changes needed:
```http
GET /api/v2/customers
```

**Current:** All endpoints are v1 (implicit, no /v1 prefix needed)

---

## Best Practices

### Request Design
- ✅ Use plural nouns (`/customers`, not `/customer`)
- ✅ Use HTTP verbs (GET, POST, PUT, DELETE)
- ✅ Use query params for filtering, not path params
- ❌ Don't use verbs in URLs (`/createCustomer` ❌, `/customers` POST ✅)

### Response Design
- ✅ Always return JSON
- ✅ Use consistent structure (`{ data, error, pagination }`)
- ✅ Include timestamps
- ❌ Don't leak sensitive info in errors

### Error Handling
- ✅ Return appropriate status codes
- ✅ Provide helpful error messages
- ✅ Include validation details
- ❌ Don't expose stack traces in production

---

## Testing APIs

### Postman Collection
Import OpenAPI spec into Postman:
1. Open Postman
2. File → Import
3. URL: http://localhost:3001/api-docs.json

### cURL Examples

**Get token:**
```bash
curl -X POST http://localhost:3001/api/dev-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dev.local"}'
```

**List customers:**
```bash
curl http://localhost:3001/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create customer:**
```bash
curl -X POST http://localhost:3001/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","email":"contact@acme.com"}'
```

---

## Further Reading

- [Authentication](AUTH.md) - How to get and use tokens
- [Security](SECURITY.md) - API security details
- [Development](DEVELOPMENT.md) - Local API development
