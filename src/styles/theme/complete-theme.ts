import { createTheme as createMuiTheme } from "@mui/material/styles";

import { COMPLETE_BRAND, completeBlue, completeColors, completeOrange } from "./complete-colors";

/**
 * Complete Logistics System custom theme
 * Based on the brand guide specifications
 */
export const completeTheme = createMuiTheme({
	palette: {
		primary: {
			main: completeBlue.main, // Complete Blue: #0B4EA2
			light: completeBlue.light,
			dark: completeBlue.dark,
			contrastText: completeBlue.contrastText,
		},
		secondary: {
			main: completeOrange.main, // Complete Orange: #F58220
			light: completeOrange.light,
			dark: completeOrange.dark,
			contrastText: completeOrange.contrastText,
		},
		background: {
			default: completeColors.background.default, // Light Gray: #F9FAFB
			paper: completeColors.background.paper,
		},
		text: {
			primary: completeColors.text.primary, // Charcoal: #1E293B
			secondary: completeColors.text.secondary, // Slate Gray: #64748B
		},
	},
	shape: {
		borderRadius: COMPLETE_BRAND.borderRadius, // 12px border radius
	},
	typography: {
		fontFamily: '"Inter","Roboto","Helvetica","Arial",sans-serif',
		h1: { fontWeight: 600 },
		h2: { fontWeight: 600 },
		h3: { fontWeight: 600 },
		h4: { fontWeight: 600 },
		h5: { fontWeight: 600 },
		h6: { fontWeight: 600 },
		body1: { fontWeight: 400 },
		body2: { fontWeight: 400 },
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: COMPLETE_BRAND.borderRadius,
				},
			},
		},
		MuiTooltip: {
			defaultProps: {
				placement: "top", // Placement per brand guide
			},
		},
		// For toast placement, we'll use the Snackbar component which supports top-right
		MuiSnackbar: {
			defaultProps: {
				anchorOrigin: {
					vertical: "top",
					horizontal: "right",
				},
			},
		},
		MuiTimelineConnector: {
			styleOverrides: {
				root: {
					backgroundColor: "var(--mui-palette-divider)",
				},
			},
		},
	},
});

/**
 * Use this function to update the theme when needed
 */
export function createCompleteTheme(_options = {}) {
	return completeTheme;
}
