import { useSnackbar, VariantType } from "notistack";

// Define toast durations according to requirements
const TOAST_DURATIONS: Record<VariantType, number> = {
	success: 3000, // 3000 ms
	info: 3000, // 3000 ms
	warning: 4000, // 4000 ms
	error: 6000, // 6000 ms (click-to-dismiss)
	default: 3000, // default duration
};

export const useToast = () => {
	const { enqueueSnackbar, closeSnackbar } = useSnackbar();

	const toast = {
		/**
		 * Shows a success toast notification
		 * @param message The message to display
		 * @param options Additional toast options
		 */
		success: (message: string, options = {}) => {
			return enqueueSnackbar(message, {
				variant: "success",
				autoHideDuration: TOAST_DURATIONS.success,
				...options,
			});
		},

		/**
		 * Shows an error toast notification
		 * @param message The message to display
		 * @param options Additional toast options
		 */
		error: (message: string, options = {}) => {
			return enqueueSnackbar(message, {
				variant: "error",
				autoHideDuration: TOAST_DURATIONS.error,
				...options,
			});
		},

		/**
		 * Shows a warning toast notification
		 * @param message The message to display
		 * @param options Additional toast options
		 */
		warning: (message: string, options = {}) => {
			return enqueueSnackbar(message, {
				variant: "warning",
				autoHideDuration: TOAST_DURATIONS.warning,
				...options,
			});
		},

		/**
		 * Shows an info toast notification
		 * @param message The message to display
		 * @param options Additional toast options
		 */
		info: (message: string, options = {}) => {
			return enqueueSnackbar(message, {
				variant: "info",
				autoHideDuration: TOAST_DURATIONS.info,
				...options,
			});
		},

		/**
		 * Closes a toast notification by ID
		 * @param key The toast ID to close
		 */
		dismiss: (key?: string | number) => {
			closeSnackbar(key);
		},

		/**
		 * Closes all toast notifications
		 */
		dismissAll: () => {
			closeSnackbar();
		},
	};

	return toast;
};
