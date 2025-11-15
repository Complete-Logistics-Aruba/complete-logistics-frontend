import React from "react";
import { Box, Breadcrumbs, Container, Link, Typography } from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { useLocation, useNavigate } from "react-router-dom";

import { dashboardConfig } from "@/config/dashboard";

interface MainLayoutProps {
	children: React.ReactNode;
}

// Helper function to find route title from config
const getRouteTitleFromConfig = (pathname: string): string | null => {
	const items = dashboardConfig.navItems[0]?.items || [];
	const item = items.find((navItem) => navItem.href === pathname);
	return item?.title || null;
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
	const location = useLocation();
	const navigate = useNavigate();
	const isHome = location.pathname === "/";

	// Get route title from config
	const routeTitle = getRouteTitleFromConfig(location.pathname);

	// Only show breadcrumbs if not on home page
	if (isHome) {
		return (
			<Container maxWidth="lg" sx={{ py: 4 }}>
				{children}
			</Container>
		);
	}

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			{/* Breadcrumbs with back button */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
				<button
					onClick={() => navigate(-1)}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						padding: 0,
						display: "flex",
						alignItems: "center",
					}}
					aria-label="Go back"
				>
					<ArrowLeftIcon size={20} weight="bold" />
				</button>

				{routeTitle ? (
					<Typography variant="h6" sx={{ fontWeight: 600 }}>
						{routeTitle}
					</Typography>
				) : (
					<Breadcrumbs aria-label="breadcrumb">
						<Link color="inherit" href="/">
							Home
						</Link>
						<Typography color="text.primary">
							{(() => {
								const segment = location.pathname.split("/").find(Boolean);
								return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "";
							})()}
						</Typography>
					</Breadcrumbs>
				)}
			</Box>

			{children}
		</Container>
	);
};
