# Mock Endpoints (MSW) — Initial Set

**Purpose:** Define the temporary mocked endpoints and response shapes.
**Last updated:** 2025-11-05

> All list endpoints may return empty lists by default:
> `{ "results": [], "count": 0 }`

## Auth

- `POST /auth/login` → token + user
- `GET /me` → current user
- `POST /auth/logout` → clears state

## FCL

- `GET /fcl` → list of FCL shipments  
  **Response:** `{ "results": [], "count": 0 }`

## Consolidation

- `GET /consolidation` → list of consolidation shipments  
  **Response:** `{ "results": [], "count": 0 }`

## LCL

- `GET /lcl` → list of LCL shipments  
  **Response:** `{ "results": [], "count": 0 }`

## Air

- `GET /air` → list of air shipments  
  **Response:** `{ "results": [], "count": 0 }`

## Invoicing

- `GET /invoicing` → list of invoices  
  **Response:** `{ "results": [], "count": 0 }`

## Documents

- `GET /documents` → list of documents  
  **Response:** `{ "results": [], "count": 0 }`

## Data Management

- `GET /data` → resources list  
  **Response:** `{ "results": [], "count": 0 }`

## Admin

- `GET /admin` → summary  
  **Response:** `{ "stats": { "users": 0, "roles": 0 } }`

### Optional: one demo row shape for tables

```json
{
	"results": [{ "id": 1001, "reference": "DEMO-001", "status": "Draft", "updated_at": "2025-01-01T12:00:00Z" }],
	"count": 1
}
```
