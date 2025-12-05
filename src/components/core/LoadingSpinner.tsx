/* eslint-disable unicorn/filename-case */
/**
 * LoadingSpinner Component
 *
 * Displays a loading spinner with optional message.
 *
 * @component
 * @example
 * ```tsx
 * <LoadingSpinner message="Loading data..." />
 * ```
 *
 * @module components/core/LoadingSpinner
 */

import React from "react";
import { Box, CircularProgress, CircularProgressProps, Typography } from "@mui/material";

export interface LoadingSpinnerProps extends Omit<CircularProgressProps, "children"> {
	/** Optional loading message */
	message?: string;
}

/**
 * LoadingSpinner Component
 *
 * Displays a centered loading spinner with optional message.
 *
 * @param props - CircularProgress props plus custom props
 * @returns LoadingSpinner component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, ...props }) => (
	<Box
		sx={{
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: 2,
			py: 4,
		}}
	>
		<CircularProgress {...props} />
		{message && (
			<Typography variant="body2" color="textSecondary">
				{message}
			</Typography>
		)}
	</Box>
);

LoadingSpinner.displayName = "LoadingSpinner";
