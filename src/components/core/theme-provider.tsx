"use client";

import type * as React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

import { appConfig } from "@/config/app";
// import { featureFlags } from "@/config/feature-flags";
import { useSettings } from "@/components/core/settings/settings-context";
// Keep using the original theme to preserve sidebar colors
import { createTheme } from "@/styles/theme/create-theme";

export interface ThemeProviderProps {
	children: React.ReactNode;
}

function CustomThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
	const { settings } = useSettings();

	const direction = settings.direction ?? appConfig.direction;
	const primaryColor = settings.primaryColor ?? appConfig.primaryColor;
	// Continue using the original theme to preserve sidebar color
	const customTheme = createTheme({ direction, primaryColor });
	// Note: We're not using the complete theme to avoid sidebar color issues

	return (
		<MuiThemeProvider theme={customTheme}>
			<CssBaseline />
			{children}
		</MuiThemeProvider>
	);
}

export { CustomThemeProvider as ThemeProvider };
