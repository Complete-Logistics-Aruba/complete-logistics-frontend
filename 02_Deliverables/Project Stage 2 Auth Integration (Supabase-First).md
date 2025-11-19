# Project Stage 2: Auth Integration (Supabase-First)

## 1. Objective

To replace the frontend's mock server with a live, production-ready authentication system. This stage is focused _only_ on authentication and user roles.

## 2. Architecture for This Stage

We will use the "Supabase-First, Backend-Later" strategy. For this stage, the React frontend will talk directly to the Supabase backend via a dedicated "API client" wrapper for isolation.

- **Frontend (React):** The existing application, hosted on Render.
- **Backend (BaaS):** Supabase (handling Auth, Database, and Roles).
- **Workflow:** `React Component` -> `authClient.ts (Wrapper)` -> `Supabase SDK`

### Non-Negotiable Principles

1.  **No Direct Supabase Calls:** React components (e.g., in `/pages/`) must _not_ import or call the Supabase client directly.
2.  **Use API Wrappers:** All Supabase logic _must_ be isolated in a new API client file (`src/lib/api/authClient.ts`). This ensures the app is insulated from the backend, allowing us to swap it for a custom "Main Brain" (Django/NET) in a future stage without rewriting the UI.

## 3. PO Responsibilities (My Tasks)

Before development begins, I will:

1.  Create the Supabase project and provide the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2.  Create the `public.profiles` table in the Supabase PostgreSQL database (schema below).
3.  Write and enable all Row Level Security (RLS) policies for the `profiles` table to ensure users can only read/update their own data.

**Database Schema: `profiles`**
(This table will store user roles and link to Supabase's built-in `auth.users` table.)

| Column  | Type   | Notes                                   |
| :------ | :----- | :-------------------------------------- |
| `id`    | `uuid` | Primary Key. References `auth.users.id` |
| `name`  | `text` | User's full name                        |
| `email` | `text` | User's email                            |
| `role`  | `text` | e.g., "Admin", "Manager", "Brokerage"   |

## 4. Developer Responsibilities (Your Scope of Work)

**Objective:** Plumb the frontend to Supabase Auth and integrate user/role management.

**Task 1: Create Auth Wrapper**

- Create a new file at `src/lib/api/authClient.ts`.
- This file will be the _only_ place in the app that imports `@supabase/supabase-js`.
- It must export the following functions:
  - `login(email, password)`
  - `logout()`
  - `onAuthStateChange(callback)`
  - `getCurrentUser()`
  - `getCurrentSession()`

**Task 2: Integrate Auth & Role Management**

- Install the Supabase SDK (`@supabase/supabase-js`).
- Update the `src/pages/auth/login.tsx` page to call your new `authClient.login()` function.
- Update the `AuthContext` (`src/lib/auth/auth-context.tsx`):
  - Use `authClient.onAuthStateChange()` to listen for login/logout events.
  - On login, the context must call `authClient.getCurrentUser()`.
  - The `getCurrentUser()` function must fetch both the Supabase `auth.users` data _and_ the corresponding data from the `public.profiles` table to get the user's `role`.
  - The `user` object in the context must now include `name`, `email`, and `role`.

**Task 3: Update Auth-Dependent Systems**

- Ensure the `RequireAuth` component works correctly with the new Supabase session.
- Ensure the `role-based-navigation.tsx` component correctly receives the user's `role` from the updated `AuthContext`.

## 5. Deliverables

- The mock auth system is fully disconnected from the login process.
- A user can successfully log in using a real account from the Supabase `auth.users` table.
- The application's `AuthContext` is populated with the user's `name`, `email`, and `role` from the `profiles` table.
- The UI (like the user popover and navigation) updates to reflect the real user's data.
