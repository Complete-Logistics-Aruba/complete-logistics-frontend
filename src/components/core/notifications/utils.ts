import { closeSnackbar, enqueueSnackbar, SnackbarKey } from "notistack";

// Define toast durations according to requirements
export const TOAST_DURATIONS = {
	success: 3000, // 3000 ms
	info: 3000, // 3000 ms
	warning: 4000, // 4000 ms
	error: 6000, // 6000 ms (click-to-dismiss)
};

// Message templates according to UX specifications from NOTIFICATIONS_UX_SCOPE.md
export const MESSAGE_TEMPLATES = {
	LOGIN_SUCCESS: (name: string) => `Welcome back, ${name}.`,
	LOGIN_ERROR: "Sign in failed. Check your email and password.",
	FORM_SAVED_MOCK: "Saved successfully (mock).",
	FORM_VALIDATION_ERROR: "Please fix the highlighted fields.",
	NETWORK_ERROR: "We couldn't reach the server. Try again.",
};

// Utility toast functions to be used throughout the app
export const toast = {
	/**
	 * Shows a success toast notification that lasts for 3000ms
	 */
	success: (message: string, options = {}) => {
		return enqueueSnackbar(message, {
			variant: "success",
			autoHideDuration: TOAST_DURATIONS.success, // 3000ms
			...options,
		});
	},

	/**
	 * Shows an error toast notification that lasts for 6000ms (click to dismiss)
	 */
	error: (message: string, options = {}) => {
		return enqueueSnackbar(message, {
			variant: "error",
			autoHideDuration: TOAST_DURATIONS.error, // 6000ms
			persist: false, // Click to dismiss
			...options,
		});
	},

	/**
	 * Shows a warning toast notification that lasts for 4000ms
	 */
	warning: (message: string, options = {}) => {
		return enqueueSnackbar(message, {
			variant: "warning",
			autoHideDuration: TOAST_DURATIONS.warning, // 4000ms
			...options,
		});
	},

	/**
	 * Shows an info toast notification that lasts for 3000ms
	 */
	info: (message: string, options = {}) => {
		return enqueueSnackbar(message, {
			variant: "info",
			autoHideDuration: TOAST_DURATIONS.info, // 3000ms
			...options,
		});
	},

	// For dismissing specific toasts
	dismiss: (key?: SnackbarKey) => {
		closeSnackbar(key);
	},

	// For dismissing all toasts
	dismissAll: () => {
		closeSnackbar();
	},
};
