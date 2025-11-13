"use client";

import React from "react";
import { GlobalStyles } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { X } from "lucide-react";
import { closeSnackbar, SnackbarKey, SnackbarProvider } from "notistack";

// Custom styling for toast notifications
const inputGlobalStyles = {
	".SnackbarItem-variantSuccess": {
		backgroundColor: "var(--mui-palette-success-main) !important",
		color: "#fff !important",
	},
	".SnackbarItem-variantError": {
		backgroundColor: "var(--mui-palette-error-main) !important",
		color: "#fff !important",
	},
	".SnackbarItem-variantWarning": {
		backgroundColor: "var(--mui-palette-warning-main) !important",
		color: "#fff !important",
	},
	".SnackbarItem-variantInfo": {
		backgroundColor: "var(--mui-palette-info-main) !important",
		color: "#fff !important",
	},
};

// Action to close a toast
const CloseButton = ({ id }: { id: SnackbarKey }) => (
	<IconButton size="small" aria-label="close" color="inherit" onClick={() => closeSnackbar(id)}>
		<X size={18} />
	</IconButton>
);

export interface ToastProviderProps {
	children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
	return (
		<>
			<GlobalStyles styles={inputGlobalStyles} />
			<SnackbarProvider
				maxSnack={5}
				anchorOrigin={{ vertical: "top", horizontal: "right" }} // top-right position as specified
				preventDuplicate // avoid duplicates
				autoHideDuration={3000} // default duration
				action={(key) => <CloseButton id={key} />}
				// Accessibility attributes
				SnackbarProps={{
					role: "alert",
					"aria-live": "polite",
				}}
			>
				{children}
			</SnackbarProvider>
		</>
	);
};
