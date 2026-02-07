# ADR 007: File Attachments Architecture

**Status:** Accepted  
**Date:** February 1, 2026

---

## Context

Tross needed file attachment capabilities for entities (work orders, invoices, customers, etc.). Key decisions were required around:

1. **URL structure** - How to expose file operations in the API
2. **Download URLs** - How to handle signed URLs for file access
3. **Permission model** - How to authorize file operations
4. **Storage** - Where to store files

---

## Decision

### 1. RESTful Sub-Resource Pattern

Files are exposed as **sub-resources** of their parent entity:

```
POST   /api/:tableName/:id/files           ← Upload file
GET    /api/:tableName/:id/files           ← List files
GET    /api/:tableName/:id/files/:fileId   ← Get single file
DELETE /api/:tableName/:id/files/:fileId   ← Delete file (soft)
```

**Why sub-resources:**

- Proper RESTful design - files belong to entities
- URL encodes the relationship - no ambiguity about which entity owns the file
- Consistent with API patterns (e.g., `/api/work_orders/123/files`)
- Permissions naturally inherit from parent entity

**Implementation:**

- `file-sub-router.js` with Express `mergeParams: true`
- Mounted via `route-loader.js` for entities with `supportsFileAttachments: true`

---

### 2. Required Download URLs

Every file response includes a ready-to-use signed URL:

| Field                     | Type     | Required | Description               |
| ------------------------- | -------- | -------- | ------------------------- |
| `download_url`            | string   | ✅ YES   | Signed R2/S3 URL          |
| `download_url_expires_at` | datetime | ✅ YES   | Absolute expiry timestamp |

**Why required (not optional):**

- No separate "get download URL" endpoint needed
- Frontend can use URL immediately without extra round-trip
- Expiry is absolute datetime, not relative seconds (easier to cache/compare)

**Why absolute expiry:**

- `expires_in: 3600` requires frontend to track when it received the response
- `expires_at: "2026-02-01T11:30:00Z"` is unambiguous, can be compared directly

**Frontend refresh pattern:**

```dart
if (file.downloadUrlExpiresAt.isBefore(DateTime.now().add(Duration(minutes: 5)))) {
  // Refresh the file to get new download URL
}
```

---

### 3. Permission Mapping

File permissions derive from the **parent entity**, not a separate permission:

| File Operation | Required Permission       |
| -------------- | ------------------------- |
| List files     | `read` on parent entity   |
| Get file       | `read` on parent entity   |
| Upload file    | `update` on parent entity |
| Delete file    | `update` on parent entity |

**Why no separate file permissions:**

- Simpler permission model - if you can edit the work order, you can manage its files
- No permission explosion (13 entities × 4 operations = 52 new permissions avoided)
- Matches user mental model - "I'm editing this work order"

---

### 4. Cloudflare R2 Storage

Files stored in Cloudflare R2 (S3-compatible):

- **Signed URLs** for secure, time-limited access
- **CORS configured** for frontend direct access (image/PDF preview)
- **Storage path:** `files/{entity_type}/{entity_id}/{uuid}-{filename}`

---

## Consequences

### Positive

- **Clean URLs** - `/api/work_orders/123/files` is intuitive
- **No extra requests** - Download URL included in every response
- **Simple permissions** - No separate file permission matrix
- **Frontend simplicity** - Just check `download_url_expires_at` to know if refresh needed

### Negative

- **URL generation on every request** - Signed URL computed even if not used
- **1-hour URL expiry** - May need refresh for long-lived pages

### Neutral

- **Soft delete only** - Files set `is_active=false`, not removed from storage
- **Category support** - Files can have categories (before_photo, document, etc.)

---

## Implementation Files

- **Sub-router:** `backend/routes/file-sub-router.js`
- **Service:** `backend/services/file-attachment-service.js`
- **Storage:** `backend/services/storage-service.js`
- **Route loader:** `backend/config/route-loader.js`
- **Frontend service:** `frontend/lib/services/file_service.dart`
- **Frontend widget:** `frontend/lib/widgets/molecules/entity_file_attachments.dart`
- **CORS docs:** `docs/operations/r2-cors-config.md`
