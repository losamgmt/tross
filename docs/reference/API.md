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
**Production:** Your deployed backend URL (e.g., `https://<your-app>.up.railway.app`)

**Live Documentation:** `<backend-url>/api-docs` (Swagger UI)

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
  "data": [
    /* array of items */
  ],
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

## Including Related Entities

Use the `include` query parameter to fetch related entities in a single request.
This avoids N+1 queries and is the recommended approach for loading relationships.

### Syntax

```http
GET /api/{entity}?include=relationship1,relationship2
GET /api/{entity}/:id?include=relationship1
```

### Examples

**Load customer with their units and invoices:**
```http
GET /api/customers/123?include=units,invoices
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "first_name": "Alice",
    "last_name": "Smith",
    "email": "alice@example.com",
    "units": [
      { "id": 10, "unit_identifier": "4A", "property_id": 1 },
      { "id": 11, "unit_identifier": "5B", "property_id": 1 }
    ],
    "invoices": [
      { "id": 201, "invoice_number": "INV-001", "status": "paid", "total": 150.00 }
    ]
  }
}
```

**Load units with their customers (M:M relationship):**
```http
GET /api/units?include=customers&limit=10
```

### Available Relationships

Relationships are defined in entity metadata. Common patterns:

| Entity | Relationships | Type |
|--------|--------------|------|
| `customer` | `units`, `invoices`, `workOrders`, `contracts` | M:M, hasMany |
| `unit` | `customers`, `assets` | M:M, hasMany |
| `work_order` | `invoices` | hasMany |
| `role` | `users` | hasMany |

### Validation

- Invalid relationship names return `400 Bad Request`
- `belongsTo` relationships are auto-loaded via JOINs (no need to include)
- Multiple relationships separated by comma: `?include=units,invoices,contracts`

### Notes

- Relationships are loaded via efficient batch queries (no N+1)
- Related data is filtered by the `fields` defined in entity metadata
- RLS currently applies to parent entity only (junction table RLS is planned)

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
  "timestamp": "<ISO-8601-timestamp>",
  "database": "connected"
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

### Batch Operations

Perform bulk create, update, or delete operations in a single transactional request.

**URL Pattern:**

```
POST /api/:tableName/batch
```

**Request:**

```http
POST /api/customers/batch
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
Idempotency-Key: batch-import-2026-03-11

{
  "operations": [
    { "operation": "create", "data": { "first_name": "Alice", "last_name": "Smith", "email": "alice@example.com" } },
    { "operation": "create", "data": { "first_name": "Bob", "last_name": "Jones", "email": "bob@example.com" } },
    { "operation": "update", "id": 123, "data": { "phone": "+1234567890" } },
    { "operation": "delete", "id": 456 }
  ],
  "options": {
    "continueOnError": false
  }
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Batch completed: 4 operations (2 created, 1 updated, 1 deleted)",
  "stats": {
    "total": 4,
    "created": 2,
    "updated": 1,
    "deleted": 1,
    "failed": 0
  },
  "results": [
    { "index": 0, "operation": "create", "success": true, "result": { "id": 101 } },
    { "index": 1, "operation": "create", "success": true, "result": { "id": 102 } },
    { "index": 2, "operation": "update", "success": true, "result": { "id": 123 } },
    { "index": 3, "operation": "delete", "success": true, "result": { "id": 456, "deleted": true } }
  ],
  "errors": []
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `continueOnError` | boolean | `false` | If `true`, continues processing after errors (partial success). If `false`, rolls back entire batch on first error. |

**Status Codes:**

| Code | Meaning |
|------|---------||
| `200` | All operations succeeded |
| `207` | Partial success (when `continueOnError=true` and some failed) |
| `400` | Invalid batch structure or validation error |
| `404` | Entity not found (for update/delete operations) |

**Limits:**

- Maximum 100 operations per batch
- Mixed operations allowed (create + update + delete in same batch)
- RLS (Row-Level Security) enforced on all operations

**Best Practices:**

- Use with `Idempotency-Key` header for retry safety
- Prefer `continueOnError: false` for data integrity
- Keep batch sizes reasonable (50-100) to avoid timeouts

---

### File Attachments

Files are attached to entities using a **sub-resource pattern**. The URL path uses `tableName` (plural, snake_case) from entity metadata.

**URL Pattern:**

```
/api/:tableName/:id/files
```

**Permission Mapping:**
| File Operation | Required Permission |
|----------------|---------------------|
| List files | `read` on parent entity |
| Get file | `read` on parent entity |
| Upload file | `update` on parent entity |
| Delete file | `update` on parent entity |

---

**List Files for Entity**

```http
GET /api/work_orders/123/files
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
      "download_url": "https://bucket.r2.cloudflarestorage.com/files/...",
      "download_url_expires_at": "2026-02-01T11:30:00Z",
      "created_at": "2025-12-15T10:30:00Z"
    }
  ]
}
```

---

**Get Single File**

```http
GET /api/work_orders/123/files/42
```

**Response:**

```json
{
  "data": {
    "id": 42,
    "entity_type": "work_order",
    "entity_id": 123,
    "original_filename": "before_photo.jpg",
    "mime_type": "image/jpeg",
    "file_size": 245760,
    "category": "before_photo",
    "download_url": "https://bucket.r2.cloudflarestorage.com/files/...",
    "download_url_expires_at": "2026-02-01T11:30:00Z",
    "created_at": "2025-12-15T10:30:00Z"
  }
}
```

> **Note:** `download_url` and `download_url_expires_at` are **always** present in file responses. No separate download endpoint needed—use the signed URL directly.

---

**Upload File**

```http
POST /api/work_orders/123/files
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
    "download_url": "https://bucket.r2.cloudflarestorage.com/files/...",
    "download_url_expires_at": "2026-02-01T11:30:00Z",
    "created_at": "2025-12-15T10:30:00Z"
  }
}
```

---

**Delete File** (Soft delete—sets `is_active=false`)

```http
DELETE /api/work_orders/123/files/42
```

---

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

| Code                  | HTTP Status | Description                                      |
| --------------------- | ----------- | ------------------------------------------------ |
| `BAD_REQUEST`         | 400         | Invalid input, missing fields, validation errors |
| `UNAUTHORIZED`        | 401         | Authentication failed, token expired/invalid     |
| `FORBIDDEN`           | 403         | Permission denied, insufficient role             |
| `NOT_FOUND`           | 404         | Resource doesn't exist                           |
| `CONFLICT`            | 409         | Duplicate entry, already exists                  |
| `INTERNAL_ERROR`      | 500         | Server error (details hidden in production)      |
| `SERVICE_UNAVAILABLE` | 503         | External service down (storage, database)        |

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

## Idempotency

Prevent duplicate mutations from network retries or double-submits. Supported on all `POST` create and batch endpoints.

### Header

```http
Idempotency-Key: <unique-key>
```

**Requirements:**

- Alphanumeric, hyphens, underscores only (regex: `^[\w-]+$`)
- Maximum 255 characters
- UUID v4 recommended (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### Behavior

| Scenario | Result |
|----------|--------|
| First request with key | Executes normally, response cached |
| Retry with same key + same payload | Returns cached response (no duplicate) |
| Same key + different payload | `422 Unprocessable Entity` (mismatch error) |
| No key provided | Normal execution (opt-in feature) |

### Example

**First Request:**

```http
POST /api/customers
Authorization: Bearer YOUR_TOKEN
Idempotency-Key: create-customer-abc123
Content-Type: application/json

{ "first_name": "Alice", "email": "alice@example.com" }
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": { "id": 42, "first_name": "Alice", "email": "alice@example.com" }
}
```

**Retry (Network failure, same key):**

```http
POST /api/customers
Idempotency-Key: create-customer-abc123
...
```

**Response:** `201 Created` (cached, no duplicate created)

```json
{
  "success": true,
  "data": { "id": 42, "first_name": "Alice", "email": "alice@example.com" }
}
```

### Payload Mismatch Error

If same key sent with different body:

```json
{
  "success": false,
  "error": "Unprocessable Entity",
  "message": "Idempotency key already used with different request body",
  "code": "IDEMPOTENCY_MISMATCH"
}
```

### Key Scoping

- Keys are **scoped per user** (same key, different users = separate operations)
- Keys expire after **24 hours** (industry standard: Stripe, AWS)
- Expired keys are cleaned up automatically

### When to Use

- **Recommended:** All create operations (`POST`)
- **Critical:** Payment/invoice creation, batch imports
- **Optional:** Reads (`GET`) don't need idempotency

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

**Allowed Origins:** Configured via `ALLOWED_ORIGINS` environment variable (see deployment config)
**Allowed Methods:** GET, POST, PUT, PATCH, DELETE  
**Allowed Headers:** Content-Type, Authorization  
**Credentials:** Supported

---

## OpenAPI/Swagger

**Interactive Documentation:** `http://localhost:<BACKEND_PORT>/api-docs` (see `config/ports.js`)

**Features:**

- Try endpoints directly in browser
- See request/response schemas
- View authentication requirements
- Download OpenAPI spec

**OpenAPI Spec:** `<backend-url>/api-docs.json`

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
3. URL: `<backend-url>/api-docs.json`

### cURL Examples

> **Note:** Replace `<backend-url>` with your local backend URL. See `config/ports.js` for port.

**Get dev token:**

```bash
curl "<backend-url>/api/dev/token?role=admin"
```

**List customers:**

```bash
curl <backend-url>/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create customer:**

```bash
curl -X POST <backend-url>/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","email":"contact@acme.com"}'
```

---

## Further Reading

- [Authentication](AUTH.md) - How to get and use tokens
- [Security](SECURITY.md) - API security details
- [Development](DEVELOPMENT.md) - Local API development
