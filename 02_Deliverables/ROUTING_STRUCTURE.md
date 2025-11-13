# Routing & App Shell – Confirmed Menu

**Purpose:** Developer reference for Step 2 (Routing & App Shell) in the Frontend Foundations setup.  
**Note:** All items are placeholders. No role-based visibility yet. Customers & Imports are removed.

## Top-Level Navigation (placeholders only)

| Order | Label                    | Route            | Notes                                                               |
| ----: | ------------------------ | ---------------- | ------------------------------------------------------------------- |
|     1 | **Dashboard**            | `/`              | Home screen                                                         |
|     2 | **Consolidation**        | `/consolidation` | Shipment mode                                                       |
|     3 | **Full container (FCL)** | `/fcl`           | Shipment mode                                                       |
|     4 | **LCL**                  | `/lcl`           | Shipment mode                                                       |
|     5 | **Air**                  | `/air`           | Shipment mode                                                       |
|     6 | **Invoicing**            | `/invoicing`     | Financial module                                                    |
|     7 | **Warehouse**            | `/warehouse`     | Placeholder                                                         |
|     8 | **Brokerage**            | `/brokerage`     | Placeholder                                                         |
|     9 | **Documents**            | `/documents`     | Placeholder                                                         |
|    10 | **Data Management**      | `/data`          | Placeholder                                                         |
|    11 | **Admin**                | `/admin`         | Placeholder; role gating will be added later (Step 6 – Auth Mocked) |

## Acceptance Checks (Owner)

- Sidebar shows exactly the items above.
- Clicking any item updates the content area without full reload.
- Breadcrumbs reflect the route path.
- Branding/theme applied (from THEME_SETUP.md).

_Last updated: 2025-11-03_
