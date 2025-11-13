import React from "react";
import { Box, Paper, Typography } from "@mui/material";

import { MainLayout } from "./main-layout";

interface PlaceholderPageProps {
	title: string;
	description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
	return (
		<MainLayout>
			<Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
				<Typography variant="h4" component="h1" gutterBottom>
					{title}
				</Typography>

				{description && (
					<Typography variant="body1" color="text.secondary" paragraph>
						{description}
					</Typography>
				)}

				<Box sx={{ mt: 4, p: 3, bgcolor: "background.default", borderRadius: 1 }}>
					<Typography variant="body2" color="text.secondary">
						This is a placeholder page for the <strong>{title}</strong> module.
					</Typography>
				</Box>
			</Paper>
		</MainLayout>
	);
};
