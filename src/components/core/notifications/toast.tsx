import React, { createContext, useContext } from "react";
import { enqueueSnackbar, useSnackbar, VariantType } from "notistack";

// Define toast durations according to requirements
export const TOAST_DURATIONS: Record<VariantType, number> = {
	success: 3000, // 3000 ms
	info: 3000, // 3000 ms
	warning: 4000, // 4000 ms
	error: 6000, // 6000 ms (click-to-dismiss)
	default: 3000, // default duration
};

// Message templates according to UX specifications
export const MESSAGE_TEMPLATES = {
	LOGIN_SUCCESS: (name: string) => `Welcome back, ${name}.`,
	LOGIN_ERROR: "Sign in failed. Check your email and password.",
	FORM_SAVED_MOCK: "Saved successfully (mock).",
	FORM_VALIDATION_ERROR: "Please fix the highlighted fields.",
	NETWORK_ERROR: "We couldn't reach the server. Try again.",
};

// Create a context for toast
const ToastContext = createContext<ReturnType<typeof useToastProvider> | null>(null);

// Custom hook to use within our provider
function useToastProvider() {
	const { enqueueSnackbar, closeSnackbar } = useSnackbar();

	return {
		success: (message: string) => {
			enqueueSnackbar(message, {
				variant: "success",
				autoHideDuration: TOAST_DURATIONS.success,
			});
		},
		error: (message: string) => {
			enqueueSnackbar(message, {
				variant: "error",
				autoHideDuration: TOAST_DURATIONS.error,
			});
		},
		warning: (message: string) => {
			enqueueSnackbar(message, {
				variant: "warning",
				autoHideDuration: TOAST_DURATIONS.warning,
			});
		},
		info: (message: string) => {
			enqueueSnackbar(message, {
				variant: "info",
				autoHideDuration: TOAST_DURATIONS.info,
			});
		},
		dismiss: (key?: string | number) => {
			closeSnackbar(key);
		},
	};
}

// Internal Provider component
export function InternalToastProvider({ children }: { children: React.ReactNode }) {
	const toast = useToastProvider();
	return <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>;
}

// Hook to use the toast
export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}

// Legacy export for backwards compatibility with existing code
export const toast = {
	success: (message: string) => {
		// Use the actual enqueueSnackbar directly to avoid context issues
		// Use imported enqueueSnackbar function
		enqueueSnackbar(message, {
			variant: "success",
			autoHideDuration: TOAST_DURATIONS.success,
		});
	},
	error: (message: string) => {
		// Use imported enqueueSnackbar function
		enqueueSnackbar(message, {
			variant: "error",
			autoHideDuration: TOAST_DURATIONS.error,
		});
	},
	warning: (message: string) => {
		// Use imported enqueueSnackbar function
		enqueueSnackbar(message, {
			variant: "warning",
			autoHideDuration: TOAST_DURATIONS.warning,
		});
	},
	info: (message: string) => {
		// Use imported enqueueSnackbar function
		enqueueSnackbar(message, {
			variant: "info",
			autoHideDuration: TOAST_DURATIONS.info,
		});
	},
};
