/**
 * Toast notification service
 *
 * This file exposes a simplified API for toast notifications with standardized durations
 * according to the UX requirements.
 */

import { SnackbarKey, VariantType } from "notistack";

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

// This is a placeholder to be used until we migrate to using the useToast hook
export const toast = {
	success: (message: string) => {
		console.log("Toast success:", message);
		// Will be replaced by notistack usage
		return null as unknown as SnackbarKey;
	},
	error: (message: string) => {
		console.log("Toast error:", message);
		// Will be replaced by notistack usage
		return null as unknown as SnackbarKey;
	},
	warning: (message: string) => {
		console.log("Toast warning:", message);
		// Will be replaced by notistack usage
		return null as unknown as SnackbarKey;
	},
	info: (message: string) => {
		console.log("Toast info:", message);
		// Will be replaced by notistack usage
		return null as unknown as SnackbarKey;
	},
};

// Eventually we'll need to replace all imports of '@/components/core/toaster' with
// import { toast } from '@/components/core/notifications/toast';
