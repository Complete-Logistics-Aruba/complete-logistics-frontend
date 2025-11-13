# Environments – Owner Scope

**Purpose:** Define owner-approved configuration environments and variables for Frontend Foundations.

_Last updated: 2025-11-05_

---

## 1️⃣ Environment Files

| File           | Purpose                                 | Status      |
| -------------- | --------------------------------------- | ----------- |
| `.env.local`   | Local development on developer machines | ✅ Required |
| `.env.staging` | Hosted preview (Render staging)         | ✅ Required |
| `.env.prod`    | Live production build                   | ✅ Required |

Each file contains non-secret configuration values. Secrets or API keys will be introduced later when backend integration begins.

---

## 2️⃣ Variables to Include

| Variable             | Example Value                | Notes                                           |
| -------------------- | ---------------------------- | ----------------------------------------------- |
| `VITE_APP_NAME`      | `Complete Logistics System`  | Browser tab / page title                        |
| `VITE_API_URL`       | `http://localhost:8000`      | Placeholder for Django API base URL             |
| `VITE_FEATURE_FLAGS` | _(optional)_                 | Developer may read from config file instead     |
| `VITE_ENV_NAME`      | `local` / `staging` / `prod` | Used for environment-specific banner or styling |

**Decision:** Keep these four variables for all environments.  
No credentials or tokens included yet.

---

## 3️⃣ Deployment Hosting Plan

| Environment | Host               | Purpose                      |
| ----------- | ------------------ | ---------------------------- |
| Local       | Developer machines | For active coding            |
| Staging     | Render             | For owner preview and review |
| Production  | Render (initially) | Final live deployment        |

**Decision:** Keep Render as the initial staging and production host.

---

## 4️⃣ Owner Review Checklist

- [ ] `.env.local`, `.env.staging`, and `.env.prod` exist in project root.
- [ ] `VITE_APP_NAME` appears correctly in browser tab.
- [ ] Changing `VITE_ENV_NAME` updates visible banner or indicator in UI.
- [ ] API URL points to `http://localhost:8000` for now.

---

**Summary of Owner Defaults:**  
✅ Three environment files (local/staging/prod)  
✅ Four configuration variables (no secrets yet)  
✅ Render as staging and production host  
✅ No owner action required until backend is connected
