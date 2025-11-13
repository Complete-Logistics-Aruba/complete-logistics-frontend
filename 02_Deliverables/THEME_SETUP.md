# Theme Setup Instructions (for Developer)

Please create or update the MUI theme file as follows.

---

## File Path

`src/styles/theme.ts`

If this folder doesn’t exist, create it.

---

## Content

```ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
	palette: {
		primary: { main: "#0B4EA2" }, // Complete Blue
		secondary: { main: "#F58220" }, // Complete Orange
		background: { default: "#F9FAFB" },
		text: {
			primary: "#1E293B",
			secondary: "#64748B",
		},
	},
	shape: { borderRadius: 12 },
	typography: {
		fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
	},
});
```

---

## Apply the Theme

Wrap the main `<App />` component with the `ThemeProvider`.

**Example:**

```tsx
// src/main.tsx
import { CssBaseline, ThemeProvider } from "@mui/material";

import { theme } from "./styles/theme";

<ThemeProvider theme={theme}>
	<CssBaseline />
	<App />
</ThemeProvider>;
```

---

## Logo Assets

Use these for header/sidebar/favicons:

- `logo_full.png` (main)
- `logo_symbol.png` (icon)
- `favicon.png` (browser tab icon)

Stored in your shared assets folder.

---

## Notes

- Primary color → buttons, links, highlights
- Secondary color → accents and hover states
- Rounded corners → 12px
- Light theme only (dark mode to be added later)
