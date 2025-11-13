# Auth (Mocked) – Scope

**Purpose:** Implement a mocked authentication flow for Frontend Foundations (no backend).  
**Last updated:** 2025-11-05

## Goals

- `/auth/login` page (email, password).
- Store a **mock access token** and current user in memory.
- Protect routes with a simple guard (redirect unauthenticated → `/auth/login`).

## Routes

- `/auth/login` – public (login form)
- All other routes – behind `RequireAuth`

## Mock Users (roles only, permissions TBD)

| Role             | Example User      | Email                 |
| ---------------- | ----------------- | --------------------- |
| Admin            | Claudio Mata      | claudio@complete.aw   |
| Manager          | Emelyn Bell       | emelyn@complete.aw    |
| Customer Service | Thais Maduro      | thais@complete.aw     |
| Accounting       | Migna Ras         | migna@complete.aw     |
| Warehouse        | Eldrick Pontilius | warehouse@complete.aw |
| Brokerage        | Genilee Thiel     | genilee@complete.aw   |
| Customer         | —                 | —                     |

## MSW Endpoints

- `POST /auth/login` → returns `{ access: "mock-token", user: { email, roles } }`
- `GET /me` → returns current user
- `POST /auth/logout` → clears state

## UI/UX

- Invalid login shows inline error.
- Successful login → toast “Welcome back, {name}.” then navigate to `/`.
- Logout → toast “Signed out.” and redirect to `/auth/login`.

## Acceptance (Owner)

- Redirect to `/auth/login` if unauthenticated.
- Logging in with a listed email works (any non-empty password).
- Logout returns to login screen.
- All menu items visible (no role gating yet).
