import React from "react";
import { Breadcrumbs, Container, Link, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";

interface MainLayoutProps {
	children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
	const location = useLocation();

	// Generate breadcrumbs from path
	const pathSegments = location.pathname.split("/").filter(Boolean);

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			{/* Breadcrumbs */}
			<Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
				<Link color="inherit" href="/">
					Home
				</Link>
				{pathSegments.map((segment, index) => {
					const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
					const isLast = index === pathSegments.length - 1;

					return isLast ? (
						<Typography color="text.primary" key={path}>
							{segment.charAt(0).toUpperCase() + segment.slice(1)}
						</Typography>
					) : (
						<Link color="inherit" href={path} key={path}>
							{segment.charAt(0).toUpperCase() + segment.slice(1)}
						</Link>
					);
				})}
			</Breadcrumbs>

			{children}
		</Container>
	);
};
