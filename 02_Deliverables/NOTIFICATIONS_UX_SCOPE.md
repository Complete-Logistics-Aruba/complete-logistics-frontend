# Notifications & UX – Owner Scope

**Purpose:** Define owner decisions for app-wide feedback patterns (toasts, loading, empty states, and errors) for Frontend Foundations.

_Last updated: 2025-11-05_

---

## 1) Toast Notifications (notistack)

**Position:** top-right  
**Variant mapping:**

- success → green
- error → red
- warning → amber
- info → blue

**Durations:**

- success/info: 3000 ms
- warning: 4000 ms
- error: 6000 ms (click-to-dismiss)

**Behavior:**

- One toast per event (avoid duplicates)
- New event replaces the previous toast of the same type (dedupe keys)
- Toasters are accessible: announce via `aria-live="polite"`

**Message Templates (copy):**

- **Login success:** “Welcome back, {name}.”
- **Login error:** “Sign in failed. Check your email and password.”
- **Form saved (mock):** “Saved successfully (mock).”
- **Form validation error:** “Please fix the highlighted fields.”
- **Network error:** “We couldn’t reach the server. Try again.”

---

## 2) Loading & Skeletons

**Tables:** skeleton rows (3–5)  
**Forms:** disable submit while loading; show button spinner  
**Pages:** show centered spinner if route-level data is loading

**Rule:** Avoid blocking overlays when possible; prefer inline indicators.

---

## 3) Empty States (copy)

**Tables:**

- Title: “No data yet.”
- Body: “When records are available, they’ll appear here.”
- Action: show a **primary** button if a related “New …” action exists (e.g., “New FCL shipment”).

**Detail pages:**

- Title: “Nothing to show.”
- Body: “Select a record from the list or create a new one.”

---

## 4) Errors

**Form errors:** show inline helper text under each field; keep toast generic.  
**Page errors:** render a friendly error block with a **Retry** button.  
**Global errors:** ErrorBoundary shows “Something went wrong.” with a **Reload** action.

**Developer guidance:** include error codes in console; keep user-facing copy simple.

---

## 5) Accessibility

- All interactive elements keyboard accessible (Tab/Shift+Tab).
- Toasts use semantic roles and polite announcements.
- Buttons have discernible text; icons include aria-labels.
- Focus visible on forms and links.

---

## 6) Acceptance Checks (Owner)

- [ ] Toasts appear top-right with the durations above.
- [ ] Login success and error messages use the specified copy.
- [ ] Submitting the mock “New FCL shipment” shows a success toast.
- [ ] Tables show skeletons while loading; empty state copy is correct.
- [ ] Forms disable submit while loading and show field-level errors.
- [ ] ErrorBoundary appears for unexpected errors with a Reload action.
- [ ] Keyboard navigation (Tab) works across main controls.
