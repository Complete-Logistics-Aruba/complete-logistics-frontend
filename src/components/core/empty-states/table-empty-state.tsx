import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Plus } from "lucide-react";

interface TableEmptyStateProps {
	/**
	 * Optional action button for creating a new record
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

export const TableEmptyState: React.FC<TableEmptyStateProps> = ({
	actionLabel,
	onAction,
	title = "No data yet.",
	description = "When records are available, they'll appear here.",
}) => {
	return (
		<Box sx={{ p: 4, textAlign: "center", width: "100%" }}>
			<Typography variant="h6" gutterBottom>
				{title}
			</Typography>
			<Typography variant="body2" color="text.secondary" paragraph>
				{description}
			</Typography>
			{actionLabel && onAction && (
				<Button variant="contained" color="primary" startIcon={<Plus size={18} />} onClick={onAction}>
					{actionLabel}
				</Button>
			)}
		</Box>
	);
};
