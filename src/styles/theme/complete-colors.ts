// Removed unused import

// Complete Logistics System brand colors as defined in the Theme Review Checklist
export const completeBlue = {
	main: "#0B4EA2", // Primary color - Complete Blue (for buttons, active links, main highlights)
	light: "#3070C9", // Lighter variant
	dark: "#093C7E", // Darker variant
	contrastText: "#FFFFFF", // Text on primary color background
};

export const completeOrange = {
	main: "#F58220", // Secondary color - Complete Orange (for hover states, secondary accents)
	light: "#FF9B45", // Lighter variant
	dark: "#D36A11", // Darker variant
	contrastText: "#FFFFFF", // Text on secondary color background
};

// Background and text colors
export const completeColors = {
	background: {
		default: "#F9FAFB", // Light Gray background as specified in checklist
		paper: "#F9FAFB", // Card background
	},
	text: {
		primary: "#1E293B", // Dark gray/black for primary text
		secondary: "#64748B", // Lighter gray for secondary text
	},
};

// Use these constants when updating the theme configuration
export const COMPLETE_BRAND = {
	primaryColor: completeBlue.main,
	secondaryColor: completeOrange.main,
	backgroundColor: completeColors.background.default,
	textPrimaryColor: completeColors.text.primary,
	textSecondaryColor: completeColors.text.secondary,
	borderRadius: 12, // 12px as specified in brand guide
};
