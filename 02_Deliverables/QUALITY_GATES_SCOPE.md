# Quality Gates – Owner Scope

**Purpose:** Define the owner-approved quality and consistency standards for Frontend Foundations.  
**Audience:** Developer(s) implementing and maintaining code quality tools and CI.

_Last updated: 2025-11-05_

---

## 1️⃣ Repository Rules (GitHub)

**Branch:** `main`  
**Protection:**

- Require pull requests to merge (no direct pushes).
- Require **1 review** (owner or delegate).
- Require status checks to pass before merge:
  - `lint`
  - `typecheck`
  - `test`
- Recommended: enable **2FA** for all GitHub accounts with write access.

---

## 2️⃣ Code Standards

| Tool                       | Purpose                    | Owner Decision |
| -------------------------- | -------------------------- | -------------- |
| **Prettier**               | Code formatting            | ✅ Required    |
| **ESLint**                 | Linting (MUI + React + TS) | ✅ Required    |
| **TypeScript strict mode** | Strict typing and safety   | ✅ Enabled     |

---

## 3️⃣ Pre-commit Checks (Husky)

**Husky + lint-staged** should run on every commit:

- `prettier --check` on changed files
- `eslint` on changed files
- Optional: `tsc --noEmit` on pre-push (to verify type correctness)

**Owner decision:** Enable Husky pre-commit even if it slightly slows down commits ✅

---

## 4️⃣ Tests (Vitest + React Testing Library)

**Scope for this phase:**

- 1 page test → e.g., `/fcl` renders an empty table state correctly
- 1 component test → e.g., FormField shows validation error text

**Coverage:** none required yet (just proof of setup).

**Commands:**

- `pnpm test` runs tests locally
- CI should also run tests automatically on pull requests.

---

## 5️⃣ Continuous Integration (GitHub Actions)

**Run on:** `pull_request` to `main`  
**Jobs:**

1. `install` – pnpm install
2. `lint` – ESLint + Prettier check
3. `typecheck` – TypeScript strict mode
4. `test` – Vitest run
5. _(Optional)_ `build` – Verify app compiles successfully

---

## 6️⃣ Owner Acceptance Checklist

- [ ] Pull requests cannot be merged without one review and passing checks.
- [ ] Running `pnpm lint`, `pnpm test`, and `pnpm build` passes locally.
- [ ] CI pipeline triggers automatically on PRs.
- [ ] Husky pre-commit runs locally before commits.
- [ ] Example tests (page + component) are included and pass.

---

**Summary of Owner Defaults:**  
✅ Branch protection ON (1 review + passing checks)  
✅ Prettier, ESLint, and strict TypeScript enabled  
✅ Husky pre-commit enabled  
✅ CI via GitHub Actions on pull requests  
✅ Minimal example tests required
