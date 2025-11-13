# Tables & Forms – Scope (FCL List + New FCL Shipment)

**Purpose:** Define the owner-approved structure for one table page and one form page. Data remains mocked/empty for now.

_Last updated: 2025-11-05_

---

## 1) TABLE — FCL Shipments List (Placeholder)

**Route:** `/fcl`

**Goal:** Show a basic table with headers and empty state (no real data).

### Columns (left → right)

1. **Reference** (string) – e.g., booking/ref #
2. **Customer** (string) – shipper/consignee display name
3. **Status** (badge) – Draft, In Progress, Closed (placeholder statuses)
4. **Updated At** (datetime, local display)
5. **Actions** (icon buttons) – “View” only (no edit/delete yet)

### Behavior

- Show headers even when empty.
- Empty state text: **“No FCL shipments yet.”** and a secondary line **“Use ‘New FCL shipment’ to create your first record.”**
- Loading state: table skeleton rows.
- Sorting: none (static headers only).
- Pagination: static controls hidden (not needed yet).

---

## 2) FORM — New FCL Shipment (Placeholder)

**Route:** `/fcl/new`

**Goal:** Scaffold a minimal create form using React Hook Form + Zod. No backend. On submit, just show a success toast.

### Fields (top → bottom)

1. **Shipment Type** – prefilled as **FCL** (read-only or hidden input).
2. **Reference** _(required, text)_ – min 3 chars; example: `FCL-0001`
3. **Customer** _(required, select)_ – show a simple select with 3 mock options (e.g., “PriceSmart Aruba”, “ACME Imports”, “Demo Client”); value is just a string for now.
4. **Incoterm** _(optional, select)_ – e.g., FOB / CIF / DDP (values mocked)
5. **Origin Port** _(optional, text)_ – free text for now
6. **Destination Port** _(optional, text)_ – free text for now
7. **Containers** _(repeatable group)_ – start with **0 rows**; add button “Add container” creates row with:
   - **Number** _(text)_ – example: `MSCU1234567` (no validation)
   - **Pieces** _(number)_ – non-negative integer
   - **Weight (kg)** _(number)_ – non-negative number

### Validation (Zod)

- `reference`: string().min(3)
- `customer`: string().min(1)
- `containers[].pieces`: number().int().min(0)
- `containers[].weight_kg`: number().min(0)

### Submit Behavior

- Button: **Create Shipment**
- On submit: **do not** call real API; just show toast: **“FCL shipment created (mock).”**
- Then redirect to **/fcl** (optional) or stay on page and clear form.

### UX / Accessibility

- Use MUI form components with clear labels & helper text.
- Show inline error messages below fields on validation failure.
- Keyboard: Enter submits form, Tab cycles fields.
- Buttons area: “Create Shipment” (primary), “Cancel” (routes back to `/fcl`).

---

## 3) Review Checklist (Owner)

- [ ] `/fcl` shows table headers and empty state text
- [ ] `/fcl/new` shows the form with fields listed above
- [ ] Required fields enforce validation (Reference, Customer)
- [ ] “Add container” adds rows; each row accepts Number, Pieces, Weight (kg)
- [ ] Submitting valid form shows a success toast (mock) and no errors
- [ ] No real API/network calls are required

---

## 4) Notes for Developer (reference)

- Use **MUI Table** for the list (no Data Grid yet).
- Use **React Hook Form + Zod** for validation.
- Containers section can be a simple array field with “Add”/“Remove”.
- Keep all data local; no persistence.
