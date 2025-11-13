import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

interface PageSpinnerProps {
	/**
	 * Optional message to display with the spinner
	 */
	message?: string;
}

export const PageSpinner: React.FC<PageSpinnerProps> = ({ message = "Loading..." }) => {
	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "300px",
				width: "100%",
			}}
		>
			<CircularProgress size={40} aria-label={message} />
			{message && (
				<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} aria-live="polite">
					{message}
				</Typography>
			)}
		</Box>
	);
};
