# Complete Logistics System (Frontend)

Internal logistics frontend built with **React + MUI + Vite + TypeScript**.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Quick Login

Use any of the demo accounts listed below with any non-empty password.

## Environment Setup

Copy `.env.local.example` → `.env.local` and fill in:

```
VITE_APP_NAME=Complete Logistics System
VITE_API_URL=http://localhost:8000
VITE_ENV_NAME=local
```

## Mock Service Worker

The system uses MSW (Mock Service Worker) to simulate API calls during development without a backend.

### Enabling/Disabling MSW

**To run with mocks enabled (default):**

```bash
pnpm dev
```

**To disable mocks and use a real backend:**

```bash
pnpm dev --no-mock
```

### How MSW Works

- All mock handlers are defined in `src/mocks/handlers.ts`
- The MSW is automatically initialized in development mode
- Network requests are visible in browser DevTools
- Mock data is stored in localStorage for persistence between page refreshes

### Adding New Mock Endpoints

1. Open `src/mocks/handlers.ts`
2. Add a new handler using the MSW syntax:

```typescript
http.get("*/your-endpoint", async ({ request }) => {
	return HttpResponse.json({ results: [], count: 0 }, { status: 200 });
});
```

## Theme Customization

The application uses Material UI v7 with a custom theme that follows the Complete Logistics brand guidelines.

### Modifying Theme Colors

1. **Brand Colors**: Edit `/src/styles/theme/complete-colors.ts`

```typescript
export const completeColors = {
	primary: {
		main: "#1A4D85", // Main brand blue
		light: "#3975B7",
		dark: "#0D2C4D",
		contrastText: "#FFFFFF",
	},
	// Add other colors here
};
```

2. **Theme Configuration**: Edit `/src/styles/theme/theme.ts` to modify:
   - Typography settings
   - Component overrides
   - Spacing and breakpoints
   - Shadow styles
3. **Global CSS Variables**: Edit `/src/styles/global.css` for:
   - Icon sizes
   - Navigation styling
   - Common utility classes

### Light/Dark Mode

Dark mode toggle is wired but disabled by default. To enable dark mode:

1. Open `/src/components/core/settings/settings-drawer.tsx`
2. Find the ColorSchemeToggle component
3. Remove the `disabled` prop

## Feature Flags

The application uses feature flags to control the visibility of certain features and menu items.

### Available Feature Flags

Edit `/src/config/feature-flags.ts` to toggle features:

```typescript
export const featureFlags = {
	// Shipping modules
	SHOW_CONSOLIDATION: true,
	SHOW_FCL: true,
	SHOW_LCL: true,
	SHOW_AIR: true,

	// Operations modules
	SHOW_WAREHOUSE: true,
	SHOW_BROKERAGE: true,

	// Business modules
	SHOW_INVOICING: true,
	SHOW_DOCUMENTS: true,
	SHOW_DATA: true,
	SHOW_ADMIN: true,
};
```

### Using Feature Flags in Code

```typescript
import { featureFlags } from '@/config/feature-flags';

// Conditional rendering example
{featureFlags.SHOW_AIR && <AirShipmentsComponent />}
```

## Adding a New Page

1. Duplicate an existing page folder in `/src/pages/`
2. Add route to `/src/routes.tsx`
3. Add menu item in `/src/config/dashboard.ts`

## Quality Checks

```bash
# Run ESLint to check code style
pnpm lint

# Fix ESLint issues automatically
pnpm lint:fix

# Check TypeScript types
pnpm typecheck

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui
```

## Deployment

### Production Build

Create a production build with:

```bash
pnpm build
```

The build output will be in the `dist` directory.

### Environment Configuration

Depending on the target environment, use the appropriate .env file:

- Local development: `.env.local`
- Staging environment: `.env.staging`
- Production environment: `.env.prod`

### Render Deployment

The application is configured for deployment on Render:

1. Connect to the GitHub repository: `Complete-Logistics-Aruba/complete-logistics-frontend`
2. Select the appropriate branch for deployment
3. Configure the build command: `pnpm install && pnpm build`
4. Set the publish directory: `dist`

## Demo Accounts

For testing purposes, use any of these accounts with any non-empty password:

- **Admin Access**:

  - Email: claudio@complete.aw
  - Role: Admin
  - Features: Access to all modules including Admin section

- **Manager Access**:

  - Email: emelyn@complete.aw
  - Role: Manager
  - Features: Access to operational modules

- **Other Role Accounts**:
  - Customer Service: thais@complete.aw
  - Accounting: migna@complete.aw
  - Warehouse: warehouse@complete.aw
  - Brokerage: genilee@complete.aw
