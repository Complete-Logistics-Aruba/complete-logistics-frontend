# Feature Flags (Owner Decisions)

**Purpose:** Define which UI sections are visible or hidden during Frontend Foundations.

**Default:** all current top-level pages are visible (placeholders).

| Flag               | Default | Purpose                                                        |
| ------------------ | ------- | -------------------------------------------------------------- |
| SHOW_CONSOLIDATION | true    | Controls visibility of the Consolidation page                  |
| SHOW_FCL           | true    | Controls visibility of the Full container (FCL) page           |
| SHOW_LCL           | true    | Controls visibility of the LCL page                            |
| SHOW_AIR           | true    | Controls visibility of the Air page                            |
| SHOW_INVOICING     | true    | Controls visibility of the Invoicing page                      |
| SHOW_WAREHOUSE     | true    | Controls visibility of the Warehouse page                      |
| SHOW_BROKERAGE     | true    | Controls visibility of the Brokerage page                      |
| SHOW_DOCUMENTS     | true    | Controls visibility of the Documents page                      |
| SHOW_DATA          | true    | Controls visibility of the Data Management page                |
| SHOW_ADMIN         | true    | Controls visibility of the Admin page (role logic added later) |

**Future Flags (planned, default off):**

- ENABLE_DARK_MODE = false
- ENABLE_HBL_TAB = false

**Notes:**

- Flags are currently implemented in a code config file, not in `.env`.
- They control **visibility only**; no backend or role logic yet.
- Owner can request to toggle any flag in future phases.

_Last updated: 2025-11-03_
