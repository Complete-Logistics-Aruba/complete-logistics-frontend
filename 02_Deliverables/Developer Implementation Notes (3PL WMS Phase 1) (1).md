# User Roles & Permissions – Logistics App

Purpose: Defines the granular roles required for the Logistics App.

Immediate Action: Refactor the current Admin/Staff system to support these specific definitions.

### Role Definitions

| **Role**               | **Example User**  | **Email**               | **Detailed Responsibilities & System Permissions**                                                                                                                                                                                                                                                                 |
| ---------------------- | ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin**              | Claudio Mata      | `claudio@complete.aw`   | **System Superuser.** • Full access to all modules, system configuration, and audit logs. • Only role capable of creating/deleting other users.                                                                                                                                                                    |
| **Ops Manager**        | Emelyn Bell       | `emelyn@complete.aw`    | **Operational Oversight (Non-Financial).** • **View/Edit:** Full access to Warehouse, CS, and Brokerage files. • **Approvals:** Can override operational holds or credit blocks. • **Reports:** Operational KPIs (Volume, Tonnage, On-time performance).                                                           |
| **Accounting Manager** | Raitza Mata       | `raitza@complete.aw`    | **Financial Oversight.** • **Scope:** Manages the Accounting team. • **Permissions:** Full access to Banking, P&L, General Ledger, and Tax Reporting. • **Approvals:** Vendor payments, Credit Limit increases, and Invoice Voids/Credit Notes.                                                                    |
| **Customer Service**   | Thais Maduro      | `thais@complete.aw`     | **Shipment Lifecycle (A-to-Z).** • **Scope:** Starts from Booking/Quoting $\rightarrow$ Documentation $\rightarrow$ **Final Invoicing**. • **Critical:** Must have **Write Access** to generate and send Invoices. • **Restriction:** Cannot access Bank Ledgers or process Vendor Payments.                       |
| **Accounting**         | Migna Ras         | `migna@complete.aw`     | **AR/AP & Banking.** • **Incoming:** Receives payments, reconciles bank statements, manages collections. • **Outgoing:** Processes payments to vendors. • **Control:** Sets Customer Credit Terms and Credit Holds. • **Restriction:** Read-only access to operational shipment data (cannot change piece counts). |
| **Warehouse**          | Eldrick Pontilius | `warehouse@complete.aw` | **Cargo Execution.** • **Inputs:** Tablet-based access for Tally, Receiving Photos, and Loading. • **Inventory:** Managing rack locations and physical inventory counts. • **Outputs:** Generates Warehouse Receipts and Release forms.                                                                            |
| **Brokerage**          | Genilee Thiel     | `genilee@complete.aw`   | **Customs Compliance.** • **Scope:** Creation of customs declarations and duty calculations. • **Docs:** Uploading commercial invoices and permit documents.                                                                                                                                                       |
| **Customer**           | —                 | —                       | Reserved for future external customer login.                                                                                                                                                                                                                                                                       |

### **Developer Implementation Notes (3PL WMS)**

The current "Stage 2" codebase only supports `Admin` and `Staff`, and only `claudio@complete.aw` exists in the database.

**1. Role Refactor (Immediate)**

- **Goal:** Replace the generic `Staff` role logic with the specific domain roles defined above.
- **Frontend Logic:** Update the `AuthContext` or `Guard` logic to recognize these new role strings:
  - `'Warehouse'` $\rightarrow$ Routes to Mobile/Tablet Views (Tally, Pick, Load).
  - `'Customer Service'` $\rightarrow$ Routes to Desktop Views (Invoicing, Booking, Reports).
  - `'Admin'` / `'Ops Manager'` / `'Accounting Manager'`-->Routes to Desktop Views (Full/Supervisor Access).

**2. Permissions Scope**

- **Phase 1 Focus:** You do not need to implement the fine-grained permissions (e.g., "Accounting can't see Tally") yet.
- **Critical Requirement:** You **MUST** implement the high-level split between **Office Screens** (Desktop) and **Warehouse Screens** (Tablet).
