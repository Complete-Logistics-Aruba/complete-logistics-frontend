# 3PL WMS – PHASE 1 SPECIFICATION (v2.5)

**Owner:** Complete Logistics Aruba (Claudio)
**Customer:** Single 3PL client
**Scope:** Receiving, Storage, and Outbound Shipping for this one customer.
**Tech:** React (MUI Devias) + Supabase (Postgres/Auth/Storage/SMTP)

---

## 0. Architecture Context

### 0.1 Tech Stack & Infrastructure

- **Frontend:** React 18 + Vite + TypeScript + Material UI (MUI v6 Devias Kit)
- **Backend:** Supabase (Postgres, Auth, Storage, SMTP)
- **Hosting:** Render (Static Site) – _As-built docs provided by Owner_
- **Connectivity:** Application requires active internet connection. No offline mode required for Phase 1.
- **Clients:**
  - Customer Service: desktop browser
  - Warehouse: tablet browser

### 0.2 Integration Pattern – Supabase-First, Backend-Later

- React components **must not** import Supabase directly.

- All data goes through wrapper modules, e.g.:

  ```
  // src/api/wmsApi.ts
  export async function createReceivingOrder(...) { ... }
  export async function tallyPallet(...) { ... }
  export async function getShippingOrderSummary(...) { ... }
  ```

- Today: wrappers use `@supabase/supabase-js`.

- Future: internal implementation can be swapped to `/api/...` without touching components.

### 0.3 Roles (Phase 1)

- **Customer Service**
  - Uploads Product Master
  - Creates Receiving Orders & Shipping Orders
  - Registers empty containers
  - Reviews receiving discrepancies
  - Uploads customer forms (inbound + outbound)
  - Sends emails to customer
- **Warehouse**
  - Takes receiving photos
  - Tally pallets
  - Put-away pallets
  - Pick pallets
  - Load pallets

No complex RBAC required beyond “Customer Service vs Warehouse” separation in the UI.

---

## 1. Core Data Model

- ### 1.1 Product Master

  **Table: `products`**

  - `item_id` (text, PK) – customer’s item number
  - `description` (text)
  - `units_per_pallet` (int, required) – used for pallet generation
  - `pallet_positions` (int, required, default 1) – how many pallet “slots” this item occupies (1, 2, 4…)
  - `active` (bool, default true)

  **Used for:**

  - Validating incoming CSVs (Receiving & Shipping)
  - Computing expected pallets (Screen 7) via `units_per_pallet`
  - Billing / reporting in later phases via `pallet_positions`
  - Displaying descriptions

---

### 1.2 Warehouses & Locations (Future-Proof)

**Table: `warehouses`**

- `id` (uuid, PK)
- `name` (text) – e.g. “Main Warehouse”
- `code` (text) – e.g. “W1”, “W2”
- `is_active` (bool, default true)

**Table: `locations`**

- `location_id` (text, PK) – e.g. `W1-12C`, `W1-AISLE`
- `warehouse_id` (uuid, FK → warehouses.id)
- `type` (text) – `'RACK'`, `'AISLE'`, `'FLOOR'`, `'STAGING'`, etc.
- `rack` (int, nullable) – for `type='RACK'`
- `level` (int, nullable) – for `type='RACK'`
- `position` (text, nullable) – e.g. `A..T` for `type='RACK'`
- `is_active` (bool, default true)
- `is_blocked` (bool, default false)

**Phase 1 conventions:**

- We define **Warehouse 1** in `warehouses`.
- The developer **seeds**:
  - All rack locations for Warehouse 1:
    - `type='RACK'`, `rack 1–8`, `level 1–4`, `position A–T`
  - A generic aisle location:
    - `location_id = 'W1-AISLE'`
    - `type = 'AISLE'`
    - `warehouse_id = W1`

**Generic AISLE logic (Phase 1):**

- Warehouse can assign pallets to `W1-AISLE` (overflow).
- No need for detailed aisle positions yet.
- Future: more AISLE locations (e.g. `W1-AISLE-01`) can be added without schema changes.

---

### 1.3 Receiving / Shipping / Inventory / Manifests

**Table: `receiving_orders`**

- `id` (uuid, PK)
- `container_num` (text)
- `seal_num` (text)
- `status` (text enum: Pending, Unloading, Staged, Received)
- `created_at` (timestamptz, default now)
- `created_by` (uuid, FK → user)
- finalized_at (timestamptz)

**Table: `receiving_order_lines`**

- `id` (uuid, PK)
- `receiving_order_id` (uuid, FK)
- `item_id` (text, FK → products.item_id)
- `expected_qty` (int)

---

**Table: `pallets`**

- `id` (uuid, PK)
- `item_id` (text, FK → products.item_id)
- `receiving_order_id` (uuid, FK)
- `shipping_order_id` (uuid, FK, nullable)
- `manifest_id` (uuid, FK, nullable)
- `qty` (int)
- `status` (text enum: Received, Stored, Staged, Loaded, Shipped)
- `location_id` (text, FK → locations.location_id, nullable)
- `created_at` (timestamptz)
- `is_cross_dock` (bool, default false) – set to `true` for pallets created via SHIP-NOW (cross-dock). Used for billing/reporting segmentation.
- `received_at` (timestamptz, nullable) – set when Receiving Order is finalized
- `shipped_at` (timestamptz, nullable) – set when Manifest is closed

---

**Table: `shipping_orders`**

- `id` (uuid, PK)
- `order_ref` (text) – human-friendly ID
- `shipment_type` (text enum: Hand_Delivery, Container_Loading)
- `seal_num` (text, nullable – used for Hand)
- `status` (text enum: Pending, Picking, Loading, Completed, Shipped)
- `created_at` (timestamptz)

**Table: `shipping_order_lines`**

- `id` (uuid, PK)
- `shipping_order_id` (uuid, FK)
- `item_id` (text)
- `requested_qty` (int)

---

**Table: `manifests`**

- `id` (uuid, PK)
- `type` (text enum: Container, Hand)
- `container_num` (text, nullable – required if type=Container)
- `seal_num` (text)
- `status` (text enum: Open, Loading, Closed)
- `created_at` (timestamptz)
- `closed_at` (timestamptz)

---

### 1.4 Files / Attachments & Storage

We use **one Supabase Storage bucket** with this structure:

- Receiving:
  - `receiving/<receiving_order_id>/<filename>`
- Outbound (by shipping order):
  - `shipping/<shipping_order_id>/<filename>`
- Manifest-level (optional):
  - `manifests/<manifest_id>/<filename>`

File types:

- Photos: JPEG, PNG
- Forms/documents: PDF, JPEG, PNG

Suggested limits (can be enforced client-side):

- Photos: max 5MB
- PDFs: max 10MB

---

## 2. Status Models

### 2.1 Receiving Order Status

- `Pending` – Customer Service created via Receiving CSV (Screen 1)
- `Unloading` – Warehouse is taking photos and tallying (Screens 5–7)
- `Staged` – Tally finished, waiting for Customer Service review (Screen 2)
- `Received` – Customer Service confirmed counts and closed inbound (Screen 2)

### 2.2 Pallet Status

- `Received` – created during Tally, not yet put-away or loaded
- `Stored` – location assigned in Put-Away (Screen 8)
- `Staged` – Pallet has been picked (Screen 10) or created via SHIP-NOW (Screen 7), waiting to be loaded.
- `Loaded` – Warehouse marks pallet as loaded (Screen 12)
- `Shipped` – Customer Service confirms final shipment (Screen 13)

### 2.3 Shipping Order Status

- `Pending` – created via Shipping CSV (Screen 3)
- `Picking` – Warehouse picking pallets (Screen 10)
- `Loading` – Warehouse loading pallets (Screen 12)
- `Completed` – Warehouse finished loading (Screen 12)
- `Shipped` – Customer Service finalized & emailed (Screen 13)

### 2.4 Manifest Status

- `Open` – container/trip defined (Screen 4 or Hand auto)
- `Loading` – Warehouse is loading (Screen 12, optional internal status)
- `Closed` – loading finished (Screen 12)

---

## 3. CSV Formats & Validation

### 3.1 Product Master CSV (Screen 0)

Columns:

- `item_id` (required)
- `description` (optional)
- `units_per_pallet` (required integer, > 0)
- `pallet_positions` (optional integer, ≥ 1; defaults to 1 if blank)

Behavior:

- This is a **replace-all** upload:
  - Truncate `products`, then insert new rows.
- Validation:
  - If `item_id` is missing → reject row.
  - If `units_per_pallet` is missing or non-numeric → reject row.
  - If `pallet_positions` is missing or non-numeric → set to `1` by default.

### SCREEN 0B – Product Master Maintenance (Customer Service)

**Purpose:**  
Allow Customer Service to adjust product data directly in the app when pallet specs are missing or change over time.

**Data:**

- Backed by `products` table:
  - `item_id`
  - `description`
  - `units_per_pallet`
  - `pallet_positions`
  - `active`

**UI:**

- Simple table/grid (MUI DataGrid or equivalent) with inline editing.

Columns:

- Item ID (read-only)
- Description (editable)
- Units per Pallet (editable, integer)
- Pallet Positions (editable, integer ≥ 1)
- Active (toggle)

Actions:

1. **Edit existing product**

   - Customer Service clicks **Edit** (or directly edits in the grid).
   - Validations:
     - `units_per_pallet` > 0
     - `pallet_positions` ≥ 1
   - On Save:
     - Update row in `products`.

2. **Add New Product**

   - Button: **[Add Product]**
   - Modal or inline row with:
     - Item ID (required, unique)
     - Description
     - Units per Pallet (required, > 0)
     - Pallet Positions (required, ≥ 1; default = 1)
     - Active (default = true)
   - On Save:
     - Insert into `products`.

3. **Deactivate Product**

   - Toggle `Active` off.
   - Behavior:
     - Deactivated products:
       - Do **not** cause import errors for past data.
       - Are excluded from future CSV validation where appropriate (dev may simply filter `active=true` in lookups).

**Notes:**

- This screen is **Customer Service-only** (desktop).
- Customer service upload (Screen 0) remains the primary way to load the initial product list; Screen 0B is for ongoing corrections and refinements.

---

### 3.2 Receiving CSV (Screen 1)

Columns:

- `item_id` (required, must exist in `products`)
- `description` (optional)
- `qty` (required integer, > 0)

Validation:

- `qty` must be > 0
- `item_id` must exist in `products`
- `qty` **must be a clean multiple** of `products.units_per_pallet`

If any row fails → **reject file** with an error listing offending items/rows.
Customer Service must correct and re-upload.

Warehouse can still adjust per-pallet qty later in Screen 7.

---

### 3.3 Shipping CSV (Screen 3)

Columns:

- `item_id` (required, must exist in `products`)
- `description` (optional)
- `qty_ordered` (required integer, > 0)

Validation:

- `qty_ordered > 0`
- `item_id` exists in `products`

---

## 4. Email Implementation

- Use **Supabase SMTP** for outgoing emails.
- Emails are **plain text** (no HTML template).
- Each email may include multiple attachments.
- “To” address is configurable (env / config).

Two core email flows:

1. **Receiving Email** (Screen 2)
   - Attach:
     - 3 receiving photos
     - Final receiving form (uploaded by Customer Service)
2. **Shipping Email** (Screen 13)
   - Attach:
     - Final shipping form
     - Any outbound photos uploaded

---

## 5. Special Logic – SHIP-NOW (Cross-Dock)

Goal: When inbound pallet is for an item that is already ordered, allow Warehouse to bypass put-away and picking.

### 5.1 When SHIP-NOW appears (Screen 7)

For each Tally row (pallet-level, item X):

- Compute RemainingQty for that item across all shipping_orders with:
  - `status IN ('Pending', 'Picking')`
- RemainingQty = requested_qty − SUM of qty already assigned to that item on pallets for those orders (Loaded + picked/assigned).

If `RemainingQty > 0` for at least one shipping order containing this item:

- Show **[SHIP-NOW]** and **[Confirm Pallet]**.

If no RemainingQty:

- Show **[Confirm Pallet]** only.

### 5.2 SHIP-NOW behavior

**SHIP-NOW behavior (Cross-Dock):**

On clicking **SHIP-NOW** for a pallet row in Screen 7:

- Create a pallet with:
  - `status = 'Staged'` (ready to ship now, bypassing put-away & picking)
  - `receiving_order_id = current receiving order`
  - `shipping_order_id = chosen shipping order` (FIFO by order `created_at`)
  - `location_id = NULL`
  - `is_cross_dock = true`
- Remove the row from the tally list.
- Reduce RemainingQty for that item on that shipping order.

---

## 6. Screens – Customer Service & Warehouse

### SCREEN 0 – Product Master Upload (Customer Service)

**Purpose:** Load product master data.

**Inputs:**

- CSV with: `item_id`, `description`, `units_per_pallet`

**Behavior:**

- Validate CSV.
- If valid:
  - Truncate `products`.
  - Insert all rows.
- On success: “Product master updated.”

---

### SCREEN 1 – Create Receiving Order (Customer Service)

Inputs:

- Container Number (required)
- Seal Number (required)
- Receiving CSV

Behavior:

- Validate per 3.2.
- Create `receiving_order` with status = `Pending`.
- Create `receiving_order_lines`.
- Save original CSV to:
  - `receiving/<receiving_order_id>/original.csv`

---

### SCREEN 5 – Pending Receipts (Warehouse)

Shows:

- All `receiving_orders` with `status='Pending'`.

Card:

- Container #
- Seal #
- Created date

Action:

- Tap card:
  - status → `Unloading`
  - go to Screen 6.

---

### SCREEN 6 – Container Photos (Warehouse)

Purpose:

- Capture required receiving photos.

UI:

- Show container # & seal #.
- 3 “photo slots” (camera/file input).

Rules:

- Must upload 3 photos to enable **Continue**.

Backend:

- Save to:
  - `receiving/<receiving_order_id>/photo_<timestamp>.jpg`

Next:

- Go to Screen 7.

---

### SCREEN 7 – Tally Pallets (Warehouse)

Purpose:

- Generate pallet records based on expected qty
- Allow corrections
- Provide SHIP-NOW option

Data:

- For each `receiving_order_line`:
  - `expected_pallets = expected_qty / units_per_pallet`
  - Create that many rows.

Each row:

- Item ID
- Description
- Qty (editable) – default = `units_per_pallet`
- Buttons:
  - **[Confirm Pallet]**
  - **[SHIP-NOW]** (only if RemainingQty > 0 for that item)

**Confirm Pallet:**

- Create pallet record (`status = 'Received'`, `shipping_order_id = NULL`, `location_id = NULL`).
- **UI Behavior:** Do not remove the row immediately. Mark the row visually as **"Confirmed"** (e.g., green checkmark or dimmed).
- **Correction/Undo:** Allow Warehouse to tap **[Undo]** on a Confirmed row. This deletes the created pallet record and re-opens the row for editing.
- **Finish Tally:**
  - Allowed when all expected rows are Confirmed (or validated override).
  - Sets `receiving_order.status = 'Staged'`.

**SHIP-NOW:**

- Determine shipping_order needing this item (FIFO among orders with RemainingQty > 0).
- Create pallet:
  - status = `Received`
  - receiving_order_id
  - shipping_order_id = that order
  - location_id = NULL
- Reduce RemainingQty for that item.
- When a pallet is created via **SHIP-NOW**, set `pallet.is_cross_dock = true`. This allows billing reports to separate cross-dock (ship-now) pallets from normal “in/out” movements.
- Remove row.

**Finish Tally:**

- Allowed when ≥1 pallet created.
- `receiving_order.status = 'Staged'`

Unconfirmed rows imply discrepancy and will show in Screen 2.

---

### SCREEN 2 – Receiving Summary (Customer Service)

Purpose:

- Compare expected vs received and finalize receiving.

Data:

- `receiving_order` with `status='Staged'`.

- Item table:

  | Item ID | Description | Expected Qty | Received Qty | Difference |

  - `Expected Qty` = from receiving_order_lines
  - `Received Qty` = SUM(pallet.qty) per item for this order
  - `Difference` = Received − Expected

Actions:

1. **Confirm Final Counts**
   - `receiving_order.status = 'Received'`.
2. **Attach Final Customer Receiving Form**
   - Upload signed form (PDF/image)
   - Store at: `receiving/<receiving_order_id>/<filename>`
3. **Send “Cargo Received” Email**
   - Plain text email via Supabase SMTP
   - Attach:
     - 3 photos from Screen 6
     - Final receiving form

---

### SCREEN 8 – Put-Away Pallets (Warehouse)

**Purpose:**

- Assign locations to received pallets OR move already stored pallets.

**Input pallets:**

1. New: `status='Received'` AND `shipping_order_id IS NULL`
2. **Internal Moves:** Allow scanning/selecting a pallet where `status='Stored'`. This allows the Warehouse to move a pallet from one rack to another. **UI:** List with: - Item ID, Description, Qty - Current Location (if any) - **New Location Selection** (Rack logic or 'Send to Aisle')

**UI:**

List with:

- Item ID
- Description
- Qty
- Location selection

Location options (Phase 1):

1. **Rack location**
   - UI:
     - Rack: `[1] [2] [3] [4] [5] [6] [7] [8]`
     - Level: `[1] [2] [3] [4]`
     - Position: `A..T`
   - App resolves to a row in `locations`:
     - `warehouse = W1`
     - `type = 'RACK'`
     - `rack = selected rack`
     - `level = selected level`
     - `position = selected position`
   - If no matching active location → error: “Location not defined”.
2. **Generic Aisle location**
   - Simple button: **[Send to Aisle]**
   - Sets `location_id = 'W1-AISLE'` (pre-defined `AISLE` location in `locations` table).

**Warning for already-used locations:**

- For chosen `location_id` (either rack location or W1-AISLE), check:
  - any `pallets` with `status='Stored'` and same `location_id`
- If yes:
  - Show warning: “Warning: Another pallet is already stored in this location.”
  - Warehouse can still proceed.

On Save per pallet:

- `pallet.location_id = resolved location_id`
- `pallet.status = 'Stored'`
- Remove pallet from list.

Optional: **Complete Put-Away** button once list is empty.

---

### SCREEN 3 – Create Shipping Order (Customer Service)

Inputs:

- Shipment Type:
  - Hand Delivery
  - Container Loading
- Shipping CSV
- For Hand Delivery:
  - Seal Number (required, stored on shipping_order)

Behavior:

- Validate CSV (3.3).
- Create `shipping_order` (status=`Pending`).
- Create `shipping_order_lines`.

---

### SCREEN 9 – Pending Shipping Orders (Warehouse)

Shows:

- `shipping_orders` with `status='Pending'`.

Card:

- Order Ref
- Shipment Type
- Created date

Action:

- Tap card → Screen 10.

---

### SCREEN 10 – Pick Pallets (Warehouse)

**Purpose:**

- Assign pallets to shipping order (for items with Remaining > 0).

**UI Header:**

- Order Ref
- Shipment Type
- **Filter/Search:** Text input to filter list by **Item ID** or Description. (Crucial for finding specific items in mixed aisles).
- Rack Filter: `[1] [2] [3] ... [All]`

Pallet list:

| Item ID | Description | Location | Qty | Select |

Show pallets where:

- `status IN ('Stored')`
- `shipping_order_id IS NULL` (unless editing)
- Item has Remaining > 0 for this order

On Select:

- Validate that picking this pallet does not exceed requested qty.
- Set `pallet.status = 'Staged'`.
- Optionally clear `location_id` (logical: pallet has left storage).
- Assign `shipping_order_id = current order`.
- Remove pallet from the pickable list.

Finish Picking:

- Enabled when ≥1 pallet selected.
- `shipping_order.status = 'Loading'`.
- Under-allocation (Remaining > 0) is allowed. Shortages do **not** block Finish Picking.

---

### SCREEN 4 – Register Empty Container (Customer Service)

Inputs:

- Container Number (required)
- Seal Number (required)

Behavior:

- Create `manifest`:
  - type = `"Container"`
  - container_num, seal_num
  - status = `Open`

Later visible in Screen 11.

---

### SCREEN 11 – Select Load Target (Warehouse)

**Purpose:**

- Choose **which Manifest** (Container or Hand Delivery Trip) this Shipping Order will be loaded into.

**UI:**

- Header:
  - Order Ref
  - Shipment Type (Container / Hand Delivery)
- Manifest List:

| Manifest Ref | Type | Container # | Seal # | Status | Select |
| ------------ | ---- | ----------- | ------ | ------ | ------ |
|              |      |             |        |        |        |

Show manifests where:

- `status = 'Open'`
- `type = shipping_order.shipment_type`
  - If **Container** → list open container manifests
  - If **Hand** → list open hand‐delivery manifests
- Manifest may contain pallets from **other shipping orders** (allowed)

**Actions:**

**1. Select Manifest:**

- User selects a manifest to load pallets into.
- Moves to **Screen 12 – Load Pallets**.

**2. Create New Manifest:**

- Button: **[Create New Manifest]**
- For Container:
  - Customer Service must have registered container earlier (Screen 4).
- For Hand Delivery:
  - System auto-creates a new Hand Delivery Trip manifest:
    - `manifest.type = 'Hand'`
    - `manifest.ref = auto-generated (e.g., TRIP-YYYY-###)`
    - `manifest.status = 'Open'`

**Behavior:**

- Every outbound load **must** have a manifest.
- Even Hand Delivery shipments require a manifest (Trip).
- Manifest is **not** closed here.
  - It stays open until all expected pallets from all shipping orders have been loaded.

**Next:**
Selecting a manifest → proceed to **Screen 12 (Load Pallets)**.**SCREEN 12 – Load Pallets (Warehouse)**

### SCREEN 12 – Load Pallets (Warehouse)

**Purpose:**

- Mark pallets as physically loaded into the selected Manifest (Container or Hand Delivery Trip).

**Data:**

- `pallets` where:
  - `shipping_order_id = current_order`
  - `status = 'Staged'`
  - `manifest_id` = NULL (not yet loaded)

**UI:**

| Item ID | Description | Qty | Loaded (checkbox) |
| ------- | ----------- | --- | ----------------- |
|         |             |     |                   |

Loaded Pallets section (below):

| Pallet ID | Item ID | Qty | Pallet Positions |

---

### Behavior:

**Check Loaded:**

- `pallet.status = 'Loaded'`
- `pallet.manifest_id = selected_manifest_id`
- Move pallet to “Loaded Pallets” list

**Uncheck Loaded:**

- `pallet.status = 'Staged'`
- `pallet.manifest_id = NULL`
- Move pallet back to the main list

---

### Finish Loading:

- **Partial loading is allowed** (not all pallets need to be loaded)
- On Finish Loading:
  - `shipping_order.status = 'Completed'`
  - **Do NOT close the manifest here**
    - Manifest may contain pallets from other orders
    - Manifest is closed only through explicit “Close Manifest” action (Screen 13)

Any pallets not marked Loaded remain `status = 'Staged'`
→ these appear as **Not Shipped** in the Manifest Summary (Screen 13).

---

**Warehouse is done here.**

---

- ### SCREEN 13 – Shipping Order Summary & Docs (Customer Service)

  **Purpose:**

  - Show what has been loaded into a specific **Manifest** (Container or Hand Delivery Trip).
  - Support an **asynchronous workflow** where the Customer Service downloads data, leaves the screen to handle offline paperwork, and returns later to finalize.

  **Data:**

  - `manifest` where `id = current_manifest_id`
  - `pallets` where:
    - `manifest_id = current_manifest_id`
    - `status = 'Loaded'`

  **UI Header:**

  - Manifest Ref / Trip ID
  - Type (Container / Hand Delivery)
  - Container # / Seal #
  - Status (Open / Closed)

  **Section 1: Loaded Items Table**

  | **Item ID** | **Description** | **Qty Loaded** |
  | ----------- | --------------- | -------------- |
  |             |                 |                |

  - `Qty Loaded` = **SUM(pallet.qty)** for that item within this manifest.

  **Section 2: Paperwork Actions (Async Workflow)**

  _Dev Note: This workflow is asynchronous. The user will click Download, **navigate away** for hours/days, and return later. Ensure the Manifest state remains stable._

  1. **Button: [Download Loading Summary (CSV)]**
     - **Action:** Downloads the current "Loaded Items Table" as a clean CSV file.
     - **State:** Does **NOT** change manifest status. It remains `'Open'`.
  2. **Offline Step (Context only):**
     - Customer Service creates external docs, prints, and gets them signed.

  **Section 3: Finalize Shipment**

  1. **Button: [Upload Signed Customer Form]**
     - **Action:** Upload the signed PDF/Image.
     - **Location:** `manifests/<manifest_id>/<filename>`
  2. **Button: [Upload Loading Photos]**
     - **Action:** Allow uploading multiple images (e.g., open container, seal, closed door).
     - **Location:** `manifests/<manifest_id>/<filename>`

  **Button: [Close Manifest & Send Email]**

  - **Enabled:** Only after at least one file (the Signed Form) is uploaded.
  - **On Click:**
    1. `manifest.status = 'Closed'`
    2. `shipping_order.status = 'Shipped'` (for all orders fully contained in this manifest).
    3. **Email:** Send plain-text email to customer with **ALL uploaded files (Signed Form + Photos) attached**.

  **Navigation Requirement:**

  - Ensure the **Customer Service Dashboard** includes a list of "Open Manifests" so the user can easily find and return to this specific manifest after the time delay.

- ### SCREEN 14 – Billing Report (Customer Service)

  **Purpose:** Provide Customer Service with a reporting-only view of billable activity. All billing is based on **pallet positions**, not pallet counts.

  **Inputs:**

  - Date From (Start Date)
  - Date To (End Date)

  #### A. Summary Table – Pallet Positions (By Date Range)

  **Logic for Date Filtering:**

  - **Inbound:** Filter by `receiving_orders.finalized_at` within the range.
  - **Outbound:** Filter by `manifests.closed_at` within the range.
  - **Storage:** Calculate overlap of _active days_ within the range.

  | **Metric**                        | **Definition & Logic**                                                                                                                                                                                                                                                                                |
  | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Storage_Pallet_Positions**      | **Sum of Daily Snapshots.** For every day in the date range, count how many pallet positions were physically in the warehouse (Status = `Received`, `Stored`, or `Staged`). _Dev Note: A simplified approximation is acceptable: `(Days_Pallet_Was_Present_In_Range) \* (product.pallet_positions)`._ |
  | **In_Pallet_Positions**           | Sum of pallet positions for pallets where `receiving_order.finalized_at` is in range AND `is_cross_dock = false`.                                                                                                                                                                                     |
  | **CrossDock_Pallet_Positions**    | Sum of pallet positions for pallets where `receiving_order.finalized_at` is in range AND `is_cross_dock = true`.                                                                                                                                                                                      |
  | **Out_Pallet_Positions**          | Sum of pallet positions for pallets where `manifest.closed_at` is in range AND `manifest.type = 'Container'`.                                                                                                                                                                                         |
  | **HandDelivery_Pallet_Positions** | Sum of pallet positions for pallets where `manifest.closed_at` is in range AND `manifest.type = 'Hand'`.                                                                                                                                                                                              |

  #### B. Hand Delivery Detail Table

  Rows: One row per **Manifest** (Trip) where `type='Hand'` and `closed_at` is in the date range.

  | **Delivery Date**    | **Manifest Ref**             | **Total_Pallet_Positions**        | **Notes** |
  | -------------------- | ---------------------------- | --------------------------------- | --------- |
  | `manifest.closed_at` | `manifest.seal_num` (or ref) | Sum of positions in that manifest |           |

  #### C. Export

  - **[Export CSV]**: Downloads the summary metrics and the detail rows.

---

#### D. Scope Boundary (Important)

- This screen is **report-only**:
  - No billing ledger table
  - No automated rate application
  - No invoices generated in the WMS
- All money calculations (rate × pallet positions) remain external to this system in Phase 1.

### SCREEN 15 – Inventory Adjustments (Customer Service)

**Purpose:**
Allow Customer Service to write off damaged or lost inventory so it does not remain "Stored" forever.

**UI:**

- Search by: Item ID or Pallet ID.
- Display Pallet details (Location, Qty, Status).
- Action: **[Write Off / Delete]**
  - Requirement: Select Reason (Damaged, Lost, Count Correction).
- **On Save:**
  - Set `pallet.status = 'WriteOff'` (or delete row, depending on preference, but soft-delete/status change is preferred for audit trail).
  - Log the action.

---

## 7. Technical Implementation Notes (Developer)

- All env vars via Vite:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Use **one** `wmsApi.ts` (or similar) for Supabase access.
- Implement DB schema via migrations/SQL.
- Seed:
  - `products` via Screen 0
  - `warehouses` (W1)
  - `locations` (RACK locations + `W1-AISLE`)
- Implement email helpers using Supabase SMTP:
  - `sendReceivingEmail(receivingOrderId)`
  - `sendShippingEmail(shippingOrderId)`
- Phase 1 RLS:
  - Can be minimal, as the app is internal and single-tenant.
- - `products.pallet_positions` should be `NOT NULL DEFAULT 1` so billing/reporting logic can safely assume a value even if the CSV or manual entry does not specify it yet.
