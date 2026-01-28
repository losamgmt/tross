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

> **Port configuration:** See [`config/ports.js`](../config/ports.js) for local port.

**Development:** `http://localhost:<BACKEND_PORT>`  
**Production:** `https://tross-api-production.up.railway.app`

**Live Documentation:** `http://localhost:<BACKEND_PORT>/api-docs` (Swagger UI)

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
- `GET /api/dev/token` (dev mode)
- `POST /api/auth0/callback` (Auth0 callback)
- `POST /api/auth0/validate` (Auth0 PKCE validation)

### Bearer Token
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting a Token

**Dev Mode:**
```bash
GET /api/dev/token?role=admin

# Available roles: admin, manager, dispatcher, technician, customer
```

**Production (Auth0 PKCE):**
```bash
# Frontend handles PKCE flow:
# 1. Redirect to Auth0 with code_challenge
# 2. Auth0 returns code to /callback
# 3. Exchange code for tokens
# 4. Validate with backend: POST /api/auth0/validate
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

> **All User CRUD operations require admin role.** Non-admin users cannot read, create, update, or delete user records via the API.

**List Users** (Admin only)
```http
GET /api/users?page=1&limit=20
```

**Get User** (Admin only)
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

**Update User** (Partial update)
```http
PATCH /api/users/:id
{
  "first_name": "Jane",
  "last_name": "Smith"
}
```

**Assign Role** (Admin only)
```http
PUT /api/users/:id/role
{
  "role_id": 2
}
```

**Deactivate User** (Sets is_active=false)
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

**Update Customer** (Partial update)
```http
PATCH /api/customers/:id
{
  "name": "Acme Corporation",
  "phone": "+1234567899"
}
```

**Deactivate Customer** (Sets is_active=false)
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

**Update Work Order** (Partial update)
```http
PATCH /api/work_orders/:id
{
  "status": "in_progress",
  "assigned_to": 456
}
```

**Deactivate Work Order** (Sets is_active=false)
```http
DELETE /api/work_orders/:id
```

---

### File Attachments

Generic file storage for any entity (work orders, customers, invoices, etc.).

**List Files for Entity**
```http
GET /api/files/:entityType/:entityId
```

**Query Parameters:**
- `category` - Filter by category (e.g., `before_photo`, `after_photo`, `document`)

**Response:**
```json
{
  "data": [
    {
      "id": 42,
      "entity_type": "work_order",
      "entity_id": 123,
      "original_filename": "before_photo.jpg",
      "mime_type": "image/jpeg",
      "file_size": 245760,
      "category": "before_photo",
      "description": "Kitchen sink before repair",
      "uploaded_by": 7,
      "created_at": "2025-12-15T10:30:00Z"
    }
  ]
}
```

**Upload File**
```http
POST /api/files/:entityType/:entityId
Content-Type: image/jpeg
X-Filename: photo.jpg
X-Category: before_photo
X-Description: Before work started

[binary file data]
```

**Response:**
```json
{
  "data": {
    "id": 42,
    "entity_type": "work_order",
    "entity_id": 123,
    "original_filename": "photo.jpg",
    "storage_key": "files/work_order/123/abc123-photo.jpg",
    "mime_type": "image/jpeg",
    "file_size": 245760,
    "category": "before_photo",
    "created_at": "2025-12-15T10:30:00Z"
  }
}
```

**Get Download URL** (Signed URL, 1 hour expiry)
```http
GET /api/files/:id/download
```

**Response:**
```json
{
  "data": {
    "download_url": "https://storage.example.com/files/...",
    "filename": "photo.jpg",
    "mime_type": "image/jpeg",
    "expires_in": 3600
  }
}
```

**Deactivate File** (Sets is_active=false)
```http
DELETE /api/files/:id
```

**Supported File Types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF
- Max size: 10MB

**File Categories:**
- `before_photo` - Work order before photos
- `after_photo` - Work order after photos
- `document` - General documents
- `signature` - Customer signatures
- `attachment` - Generic attachments (default)

---

## Error Handling

All errors use the unified `AppError` class with explicit status codes. The response format is consistent:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2026-01-16T10:30:00Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input, missing fields, validation errors |
| `UNAUTHORIZED` | 401 | Authentication failed, token expired/invalid |
| `FORBIDDEN` | 403 | Permission denied, insufficient role |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate entry, already exists |
| `INTERNAL_ERROR` | 500 | Server error (details hidden in production) |
| `SERVICE_UNAVAILABLE` | 503 | External service down (storage, database) |

### Validation Errors
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Validation failed",
  "details": {
    "email": "Email is required",
    "phone": "Phone must be 10-15 digits"
  },
  "timestamp": "2026-01-16T10:30:00Z"
}
```

### Authentication Errors
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token",
  "timestamp": "2026-01-16T10:30:00Z"
}
```

### Permission Errors
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Insufficient permissions for this action",
  "timestamp": "2026-01-16T10:30:00Z"
}
```

### Not Found Errors
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Customer with ID 999 not found",
  "timestamp": "2026-01-16T10:30:00Z"
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
**Allowed Methods:** GET, POST, PUT, PATCH, DELETE  
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

**Get dev token:**
```bash
curl "http://localhost:3001/api/dev/token?role=admin"
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
