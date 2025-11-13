# Complete Logistics System — Brand Guide

**Purpose:** Single source of truth for branding used in the MUI theme.
**Last updated:** 2025-11-05

## 1) Application Identity

- **App Title:** Complete Logistics System
- **Short Name:** CLS Admin

## 2) Logo & Icons

| Asset        | File (suggested name) | Notes                         |
| ------------ | --------------------- | ----------------------------- |
| Primary Logo | `logo_full.png`       | Wordmark (COMPLETE LOGISTICS) |
| Icon Logo    | `logo_symbol.png`     | Hexagon symbol (blue/orange)  |
| Favicon      | `favicon.png`         | 32×32 or 48×48 PNG            |

## 3) Color Palette (Web / MUI-ready)

| Role               | Name            | Hex       |
| ------------------ | --------------- | --------- |
| **Primary**        | Complete Blue   | `#0B4EA2` |
| **Secondary**      | Complete Orange | `#F58220` |
| **Background**     | Light Gray      | `#F9FAFB` |
| **Text Primary**   | Charcoal        | `#1E293B` |
| **Text Secondary** | Slate Gray      | `#64748B` |

## 4) Typography

- Headings: Inter / Roboto, **600**
- Body: Inter / Roboto, **400**
- Optional numbers: Roboto Mono

## 5) Component Guidelines

- Border radius: **12px**
- Primary buttons: **Blue**; Secondary: **Orange** (outlined acceptable)
- Toasts: **top-right**
- Sidebar: light background with blue logo

## 6) Developer Note (MUI)

Example `theme.ts` snippet:

```ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
	palette: {
		primary: { main: "#0B4EA2" },
		secondary: { main: "#F58220" },
		background: { default: "#F9FAFB" },
		text: { primary: "#1E293B", secondary: "#64748B" },
	},
	shape: { borderRadius: 12 },
	typography: { fontFamily: '"Inter","Roboto","Helvetica","Arial",sans-serif' },
});
```
