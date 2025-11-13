import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

interface DetailEmptyStateProps {
	/**
	 * Optional action button
	 */
	actionLabel?: string;
	/**
	 * Optional callback when the action button is clicked
	 */
	onAction?: () => void;
	/**
	 * Optional custom title
	 */
	title?: string;
	/**
	 * Optional custom description
	 */
	description?: string;
}

export const DetailEmptyState: React.FC<DetailEmptyStateProps> = ({
	actionLabel,
	onAction,
	title = "Nothing to show.",
	description = "Select a record from the list or create a new one.",
}) => {
	return (
		<Box
			sx={{
				p: 4,
				textAlign: "center",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "200px",
				width: "100%",
			}}
		>
			<Typography variant="h6" gutterBottom>
				{title}
			</Typography>
			<Typography variant="body2" color="text.secondary" paragraph>
				{description}
			</Typography>
			{actionLabel && onAction && (
				<Button variant="outlined" onClick={onAction}>
					{actionLabel}
				</Button>
			)}
		</Box>
	);
};
