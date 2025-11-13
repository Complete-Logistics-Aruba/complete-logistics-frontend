import React from "react";
import { Box, Typography } from "@mui/material";

// Environment colors
const ENV_COLORS = {
	local: "#388E3C", // Green for local development
	staging: "#FFA000", // Amber for staging
	prod: "#D32F2F", // Red for production (only shown in development mode)
};

type EnvName = "local" | "staging" | "prod";

export const EnvIndicator: React.FC = () => {
	const envName = (import.meta.env.VITE_ENV_NAME as EnvName) || "local";

	// Only show in non-production environments or when forced in development
	const showIndicator = envName !== "prod" || import.meta.env.DEV;

	if (!showIndicator) {
		return null;
	}

	return (
		<Box
			sx={{
				position: "fixed",
				bottom: 0,
				right: 0,
				bgcolor: ENV_COLORS[envName] || "#666",
				color: "white",
				py: 0.5,
				px: 2,
				zIndex: 9999,
				borderTopLeftRadius: 4,
				opacity: 0.9,
			}}
		>
			<Typography variant="caption" fontWeight="bold">
				{envName.toUpperCase()} ENVIRONMENT
			</Typography>
		</Box>
	);
};
