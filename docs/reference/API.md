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

> **Port configuration:** See [`config/ports.js`](../../config/ports.js) for local port.

**Development:** `http://localhost:<BACKEND_PORT>`  
**Production:** Your deployed backend URL (e.g., `https://<your-app>.up.railway.app`)

**Live Documentation:** `<backend-url>/api-docs` (Swagger UI)

---

## Request/Response Patterns

### Request

Requests are JSON over HTTP, authenticated with a bearer token:

```http
POST /api/{resource}
Authorization: Bearer <access-token>
Content-Type: application/json

{ /* resource fields — see OpenAPI for the per-resource schema */ }
```

### Response Envelope

All responses share a single, consistent envelope. The **authoritative schema is the generated OpenAPI spec / Swagger UI**; the skeletons below are illustrative only.

**Success** — a `success` flag, the `data` payload, and a `timestamp`; list endpoints add a `pagination` block:

```jsonc
{ "success": true, "data": { /* resource or array */ }, "timestamp": "<ISO-8601>" }
```

**Error** — `success: false`, a human-readable `error` name, a stable machine-readable `code`, a human-readable `message`, and a `timestamp`; validation errors add a structured `details` object (see [Error Handling](#error-handling)):

```jsonc
{ "success": false, "error": "<Human Name>", "code": "<MACHINE_CODE>", "message": "<human-readable>", "timestamp": "<ISO-8601>" }
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

List endpoints are paginated, sorted, and filtered via query parameters:

```http
GET /api/{resource}?page=1&limit=20&sort=name&order=asc
```

- `page` — page number
- `limit` — items per page (a default and an enforced maximum apply; see OpenAPI/config)
- `sort` — field to sort by
- `order` — `asc` or `desc`

The response carries the items in `data` and a `pagination` block (current page, page size, totals, and next/previous flags):

```jsonc
{ "success": true, "data": [ /* items */ ], "pagination": { /* page, limit, total, totalPages, hasNext, hasPrev */ }, "timestamp": "<ISO-8601>" }
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
GET /api/work_orders?status=pending&created_after=2025-01-01
```

Filterable fields are per-resource and defined in entity metadata.

---

## Including Related Entities

Use the `include` query parameter to fetch related entities in a single request.
This avoids N+1 queries and is the recommended approach for loading relationships.

### Syntax

```http
GET /api/{entity}?include=relationship1,relationship2
GET /api/{entity}/:id?include=relationship1
```

### Example

```http
GET /api/customers/123?include=units,invoices
```

The related entities are nested under the parent in the `data` payload. Each relationship's available fields come from the related entity's metadata; the per-resource relationship list is published in the OpenAPI schema.

### Behavior

- Invalid relationship names return `400 Bad Request`.
- `belongsTo` relationships are auto-loaded via JOINs (no need to `include` them).
- Multiple relationships are comma-separated.
- Related data is loaded with efficient batch queries (no N+1) and filtered to the fields defined in metadata.
- Row-level security on included relationships is scoped to the parent entity.

---

## Authentication

**All endpoints require authentication except:**

- `GET /api/health`
- `GET /api/dev/token` (dev mode)
- `POST /api/auth0/callback` (Auth0 callback)
- `POST /api/auth0/validate` (Auth0 PKCE validation)

### Bearer Token

```http
Authorization: Bearer <access-token>
```

### Getting a Token

**Dev Mode:**

```bash
GET /api/dev/token?role=<role>
```

In dev mode, a token can be minted for any role in the role hierarchy.

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

Returns liveness plus key dependency status (e.g. database connectivity). The exact response fields and status values are defined by the health route and the OpenAPI spec.

---

### Resource Endpoints (CRUD)

Every entity exposes a consistent set of REST endpoints, generated from its metadata. The **full, authoritative list of resources, routes, and request/response schemas lives in the OpenAPI spec / Swagger UI** — this document describes only the conventions.

| Verb & Path | Purpose |
|-------------|---------|
| `GET /api/{resource}` | List (paginated, filterable, sortable) |
| `GET /api/{resource}/:id` | Fetch one |
| `POST /api/{resource}` | Create |
| `PATCH /api/{resource}/:id` | Partial update |
| `DELETE /api/{resource}/:id` | Deactivate (soft delete — sets `is_active=false`) |

Conventions:

- **Partial updates** use `PATCH`; send only the fields that change.
- **Deletes are soft** by default — the record is deactivated, not removed.
- **Authorization** is per-resource and per-action (see [Security](SECURITY.md)); some resources are role-restricted (e.g. user administration is admin-only).
- **Per-resource fields** (required, optional, types, enums) are defined in entity metadata and published in the OpenAPI schema — they are not duplicated here.

---

### Batch Operations

Perform bulk create, update, and delete operations in a single request.

**URL Pattern:**

```
POST /api/:tableName/batch
```

A batch carries an ordered list of operations (mixed create/update/delete allowed) plus options, and supports the `Idempotency-Key` header for safe retries. By default the batch is **atomic** — any failure rolls back the whole batch; with `continueOnError` it processes independently and reports **partial success** (`207 Multi-Status`) with a per-operation result list. The exact request/response schema is defined in the OpenAPI spec.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `continueOnError` | boolean | `false` | If `true`, continues processing after errors (partial success). If `false`, rolls back entire batch on first error. |

**Status Codes:**

| Code | Meaning |
|------|---------|
| `200` | All operations succeeded |
| `207` | Partial success (when `continueOnError=true` and some failed) |
| `400` | Invalid batch structure or validation error |
| `404` | Entity not found (for update/delete operations) |

**Limits:**

- A bounded maximum number of operations per batch (see OpenAPI/config)
- Mixed operations allowed (create + update + delete in the same batch)
- RLS (Row-Level Security) enforced on all operations

**Best Practices:**

- Use with an `Idempotency-Key` header for retry safety
- Prefer `continueOnError: false` for data integrity
- Keep batch sizes reasonable to avoid timeouts

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

**Operations:**

- **List** — `GET /api/{resource}/:id/files` (optionally filtered by `category`)
- **Get one** — `GET /api/{resource}/:id/files/:fileId`
- **Upload** — `POST /api/{resource}/:id/files` with the binary body; the filename, category, and description are supplied via request headers
- **Delete** — `DELETE /api/{resource}/:id/files/:fileId` (soft delete)

File responses always include a **time-limited signed download URL**, so no separate download endpoint is needed — use the signed URL directly.

**Constraints** (authoritative values in the OpenAPI spec / config): a bounded set of categories (e.g. before/after photos, documents, signatures, attachments), an allow-list of MIME types (common image formats and PDF), and a maximum file size.

---

## Error Handling

Errors use a single consistent envelope: `success: false`, a human-readable `error` name, a stable machine-readable **code**, a human-readable **message**, a **timestamp**, and — for validation failures — a structured **details** object. Errors are produced centrally (a unified error type plus a single response formatter), so the shape is uniform across the API. The authoritative schema is the OpenAPI spec.

```jsonc
{
  "success": false,
  "error": "Bad Request",
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "details": { "email": "Email is required" },
  "timestamp": "<ISO-8601>"
}
```

### Error Codes

The stable, machine-readable codes (illustrative; the OpenAPI spec is authoritative):

| Code                            | HTTP Status | Description                                      |
| ------------------------------- | ----------- | ------------------------------------------------ |
| `VALIDATION_FAILED`             | 400         | Invalid input / validation error                 |
| `VALIDATION_MISSING_FIELD`      | 400         | A required field is missing                      |
| `AUTH_REQUIRED`                 | 401         | Authentication required                          |
| `AUTH_INVALID_TOKEN`            | 401         | Token missing, malformed, or invalid             |
| `AUTH_TOKEN_EXPIRED`            | 401         | Token expired                                    |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403         | Permission denied, insufficient role             |
| `RESOURCE_NOT_FOUND`            | 404         | Resource doesn't exist                           |
| `RESOURCE_CONFLICT`             | 409         | Conflicting state / duplicate                    |
| `RATE_LIMIT_EXCEEDED`           | 429         | Too many requests                                |
| `SERVER_ERROR`                  | 500         | Unexpected server error (hidden in production)   |
| `SERVER_UNAVAILABLE`            | 503         | External dependency down (storage, database)     |

Domain-specific codes (e.g. `APPROVAL_REQUIRED`, `IDEMPOTENCY_MISMATCH`, `IMMUTABLE_FIELD_VIOLATION`) are also emitted for specific workflows. The canonical set is defined in `backend/config/error-codes.js`.

---

## Idempotency

Prevent duplicate mutations from network retries or double-submits. Supported on all `POST` create and batch endpoints.

### Header

```http
Idempotency-Key: <unique-key>
```

The key is a client-generated unique string (a UUID is recommended), bounded in length.

### Behavior

| Scenario | Result |
|----------|--------|
| First request with key | Executes normally; response cached |
| Retry with same key + same payload | Returns the cached response (no duplicate) |
| Same key + different payload | `422 Unprocessable Entity` (mismatch) |
| No key provided | Normal execution (opt-in) |

Keys are **scoped per user** and expire after a fixed retention window, after which they are cleaned up automatically. A mismatch returns the standard error envelope with a stable code.

### When to Use

- **Recommended:** All create operations (`POST`)
- **Critical:** Payment/invoice creation, batch imports
- **Optional:** Reads (`GET`) don't need idempotency

---

## Rate Limiting

API requests are rate-limited per client, with a stricter limit on login attempts; exact thresholds are configured centrally. Standard `X-RateLimit-*` headers report the limit, remaining quota, and reset time, and an exceeded limit returns `429 Too Many Requests` using the standard error envelope.

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
- ✅ Use the single consistent response envelope
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

**Get a dev token:**

```bash
curl "<backend-url>/api/dev/token?role=<role>"
```

**List a resource:**

```bash
curl <backend-url>/api/{resource} \
  -H "Authorization: Bearer <access-token>"
```

**Create a resource:**

```bash
curl -X POST <backend-url>/api/{resource} \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{ /* resource fields */ }'
```

---

## Further Reading

- [Authentication](AUTH.md) - How to get and use tokens
- [Security](SECURITY.md) - API security details
- [Development](../getting-started/DEVELOPMENT.md) - Local API development
