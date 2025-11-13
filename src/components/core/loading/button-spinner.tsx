import React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

interface LoadingButtonProps extends ButtonProps {
	/**
	 * Whether the button is in loading state
	 */
	loading?: boolean;
	/**
	 * The label to show when the button is loading
	 */
	loadingLabel?: string;
	/**
	 * Icon to display when not loading
	 */
	startIcon?: React.ReactNode;
	/**
	 * Button contents
	 */
	children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
	loading = false,
	loadingLabel,
	startIcon,
	children,
	disabled,
	...rest
}) => {
	return (
		<Button
			startIcon={loading ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : startIcon}
			disabled={loading || disabled}
			{...rest}
		>
			{loading && loadingLabel ? loadingLabel : children}
		</Button>
	);
};
