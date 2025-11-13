# API Client + MSW — Scope

**Purpose:** Enable a frontend-first workflow by mocking API calls with MSW while using a shared API client wrapper.
**Last updated:** 2025-11-05

## Decisions (Owner)

- `VITE_API_URL = http://localhost:8000` (placeholder for Django)
- Mock responses should be **empty lists** by default
- Mocked requests should be **visible** in the browser network tab

## Deliverables (Developer)

1. `src/lib/api/apiClient.ts` – wrapper (baseURL, JSON, error handling)
2. `src/mocks/handlers.ts` – MSW handlers for endpoints below
3. MSW bootstrapped in dev only; easy toggle off
4. Example page uses `apiClient` (no direct `fetch`)

## Acceptance

- App runs without a backend.
- Requests to endpoints return valid JSON per MOCK_ENDPOINTS.md.
- Disabling MSW shows calls targeting `VITE_API_URL`.
