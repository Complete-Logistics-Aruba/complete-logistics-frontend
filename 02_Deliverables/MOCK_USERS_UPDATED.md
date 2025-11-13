# Mock Users – Complete Logistics (Frontend Foundations)

**Purpose:** Define realistic mock user accounts for login simulation during Frontend Foundations.  
**Note:** Authentication is mocked (no backend). Roles exist for structure only; permissions will be defined later.

| Role                 | Example User      | Email                 | Notes                                       |
| -------------------- | ----------------- | --------------------- | ------------------------------------------- |
| **Admin**            | Claudio Mata      | claudio@complete.aw   | Full system access                          |
| **Manager**          | Emelyn Bell       | emelyn@complete.aw    | Oversees operations and workflow            |
| **Customer Service** | Thais Maduro      | thais@complete.aw     | Handles client communication and booking    |
| **Accounting**       | Migna Ras         | migna@complete.aw     | Responsible for invoicing and financials    |
| **Warehouse**        | Eldrick Pontilius | warehouse@complete.aw | Updates receiving and inventory data        |
| **Brokerage**        | Genilee Thiel     | genilee@complete.aw   | Manages customs and documentation           |
| **Customer**         | —                 | —                     | Reserved for future external customer login |

---

### Behavior (Mocked)

- Any user listed above can log in using their email and any non-empty password.
- The mock login will return:
  ```json
  {
  	"access": "mock-token",
  	"user": { "email": "user@complete.aw", "roles": ["role-name"] }
  }
  ```
- No real authentication or validation occurs (handled by MSW).

### Future Use

- These same users and roles will serve as seed data for Django authentication.
- Role-based permissions will be added later (Phase 2).

_Last updated: 2025-11-04_
