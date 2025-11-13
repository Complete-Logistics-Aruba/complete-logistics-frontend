# API Client + MSW – Owner Decisions

**Purpose:** Record owner-side decisions for Step 5 of Frontend Foundations (API Client + MSW setup).

## ✅ Confirmed Decisions

### 1️⃣ API Base URL

- **Base URL placeholder:** `http://localhost:8000`
- This matches the default Django dev server URL.
- Will be replaced with the real backend URL (Render or AWS) when backend modules go live.

### 2️⃣ Mock Endpoint Data

- **Preference:** Keep mock endpoints **empty**.
- Mocks should return:
  ```json
  { "results": [], "count": 0 }
  ```
- This keeps the setup simple and allows real data integration later without cleanup.

### 3️⃣ Browser Network Visibility

- **Preference:** MSW should be **visible in the browser network tab.**
- Owner wants to see mock endpoints (e.g., `/fcl`, `/invoicing`) appear under “Network” in DevTools for visibility.

### 4️⃣ Review Checklist (Owner)

- [ ] App loads without backend running.
- [ ] Each route successfully returns a mocked JSON response (empty list).
- [ ] Mocked API calls visible in DevTools network tab.
- [ ] Disabling MSW causes visible 404s (proof mocks are active).
- [ ] `VITE_API_URL` matches the confirmed placeholder.

_Last updated: 2025-11-04_
