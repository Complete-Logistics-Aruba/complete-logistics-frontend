import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { RefreshCw } from "lucide-react";

interface PageErrorProps {
	/**
	 * Error object
	 */
	error?: Error;
	/**
	 * Callback to retry loading the data
	 */
	onRetry?: () => void;
	/**
	 * Custom error title
	 */
	title?: string;
	/**
	 * Custom error message
	 */
	message?: string;
}

export const PageError: React.FC<PageErrorProps> = ({
	error,
	onRetry,
	title = "Unable to load data",
	message = "There was a problem loading this page. Please try again.",
}) => {
	return (
		<Box sx={{ width: "100%", p: 2 }}>
			<Paper
				elevation={0}
				sx={{
					p: 3,
					border: "1px solid var(--mui-palette-error-light)",
					backgroundColor: "rgba(var(--mui-palette-error-mainChannel) / 0.05)",
					borderRadius: 1,
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Box>
						<Typography variant="h6" component="h2" gutterBottom>
							{title}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{message}
						</Typography>
						{error && process.env.NODE_ENV !== "production" && (
							<Typography
								variant="caption"
								component="pre"
								sx={{
									mt: 2,
									p: 1,
									backgroundColor: "rgba(0,0,0,0.04)",
									borderRadius: 0.5,
									overflowX: "auto",
									fontFamily: "monospace",
								}}
							>
								{error.message}
							</Typography>
						)}
					</Box>
					{onRetry && (
						<Button variant="outlined" color="error" startIcon={<RefreshCw size={18} />} onClick={onRetry}>
							Retry
						</Button>
					)}
				</Box>
			</Paper>
		</Box>
	);
};
