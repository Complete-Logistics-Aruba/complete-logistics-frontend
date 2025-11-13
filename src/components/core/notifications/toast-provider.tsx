"use client";

import React from "react";
import IconButton from "@mui/material/IconButton";
import { X } from "lucide-react";
import { closeSnackbar, SnackbarKey, SnackbarProvider } from "notistack";

// Action to close a toast
const CloseButton = ({ id }: { id: SnackbarKey }) => (
	<IconButton size="small" aria-label="close" color="inherit" onClick={() => closeSnackbar(id)}>
		<X size={18} />
	</IconButton>
);

export interface ToastProviderProps {
	children: React.ReactNode;
}

// Note: This component is deprecated - use simple-toast-provider.tsx instead
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
	return (
		<SnackbarProvider
			maxSnack={5}
			anchorOrigin={{ vertical: "top", horizontal: "right" }}
			preventDuplicate
			autoHideDuration={3000}
			action={(key) => <CloseButton id={key} />}
			SnackbarProps={{
				role: "alert",
				"aria-live": "polite",
			}}
		>
			{children}
		</SnackbarProvider>
	);
};
