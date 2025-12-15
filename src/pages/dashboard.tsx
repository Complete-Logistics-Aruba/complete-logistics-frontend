/**
 * Dashboard Page
 *
 * Role-based dashboard showing navigation to relevant screens.
 * CSE dashboard: screens 0, 0B, 1, 2, 3, 4, 14, 15
 * WH dashboard: screens 5-12
 *
 * @module pages/Dashboard
 */
import React, { useEffect, useState } from "react";
import {
	AppBar,
	Box,
	Button,
	Card,
	CardContent,
	Container,
	Menu,
	MenuItem,
	Stack,
	Toolbar,
	Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth";

interface DashboardLink {
	label: string;
	description: string;
	screen: number | string;
	path: string;
}

/**
 * CSE Dashboard Links
 */
const CSE_LINKS: DashboardLink[] = [
	{
		label: "Product Master Upload",
		description: "Upload product catalog via CSV",
		screen: "0",
		path: "/screens/0",
	},
	{
		label: "Product Master Maintenance",
		description: "View and edit products",
		screen: "0B",
		path: "/screens/0b",
	},
	{
		label: "Create Receiving Order",
		description: "Create new receiving orders",
		screen: "1",
		path: "/screens/1",
	},
	{
		label: "Receiving Summary",
		description: "Review and confirm receiving",
		screen: "2",
		path: "/screens/2",
	},
	{
		label: "Create Shipping Order",
		description: "Create new shipping orders",
		screen: "3",
		path: "/screens/3",
	},
	{
		label: "Register Empty Container",
		description: "Register empty containers",
		screen: "4",
		path: "/screens/4",
	},
	{
		label: "Billing Report",
		description: "View billing metrics and export",
		screen: "14",
		path: "/screens/14",
	},
	{
		label: "Inventory Adjustments",
		description: "Write off damaged or lost items",
		screen: "15",
		path: "/screens/15",
	},
];

/**
 * WH Dashboard Links
 */
const WH_LINKS: DashboardLink[] = [
	{
		label: "Pending Receipts",
		description: "View pending receiving orders",
		screen: "5",
		path: "/screens/5",
	},
	{
		label: "Container Photos",
		description: "Capture container photos",
		screen: "6",
		path: "/screens/6",
	},
	{
		label: "Tally Pallets",
		description: "Tally received pallets",
		screen: "7",
		path: "/screens/7",
	},
	{
		label: "Put-Away Pallets",
		description: "Assign storage locations",
		screen: "8",
		path: "/screens/8",
	},
	{
		label: "Pending Shipping Orders",
		description: "View pending shipping orders",
		screen: "9",
		path: "/screens/9",
	},
	{
		label: "Pick Pallets",
		description: "Pick pallets for shipping",
		screen: "10",
		path: "/screens/10",
	},
	{
		label: "Select Load Target",
		description: "Select load target",
		screen: "11",
		path: "/screens/11",
	},
	{
		label: "Load Pallets",
		description: "Load pallets onto container",
		screen: "12",
		path: "/screens/12",
	},
];

/**
 * Dashboard Page Component
 *
 * Displays role-based navigation to available screens.
 * Shows user info and logout button.
 */
export function Dashboard() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	// Redirect if not authenticated
	useEffect(() => {
		if (!user) {
			navigate("/login");
		}
	}, [user, navigate]);

	if (!user) {
		return null;
	}

	const links = user.role === "Customer Service" ? CSE_LINKS : WH_LINKS;
	const dashboardTitle = user.role === "Customer Service" ? "CSE Dashboard" : "Warehouse Dashboard";

	const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};

	const handleLogout = async () => {
		handleMenuClose();
		try {
			await logout();
			navigate("/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
			{/* App Bar */}
			<AppBar position="static">
				<Toolbar>
					<Typography variant="h6" sx={{ flexGrow: 1 }}>
						Complete Logistics System
					</Typography>
					<Button color="inherit" onClick={handleMenuOpen}>
						{user.email}
					</Button>
					<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
						<MenuItem disabled>Role: {user.role}</MenuItem>
						<MenuItem onClick={handleLogout}>Logout</MenuItem>
					</Menu>
				</Toolbar>
			</AppBar>

			{/* Main Content */}
			<Container maxWidth="lg" sx={{ py: 4 }}>
				{/* Header */}
				<Stack spacing={2} sx={{ mb: 4 }}>
					<Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
						{dashboardTitle}
					</Typography>
					<Typography variant="body1" color="textSecondary">
						Welcome, {user.email}. Select a screen to get started.
					</Typography>
				</Stack>

				{/* Links Grid */}
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: {
							xs: "1fr",
							sm: "repeat(2, 1fr)",
							md: "repeat(3, 1fr)",
						},
						gap: 3,
					}}
				>
					{links.map((link) => (
						<Card
							key={link.path}
							sx={{
								height: "100%",
								display: "flex",
								flexDirection: "column",
								cursor: "pointer",
								transition: "all 0.3s ease",
								"&:hover": {
									boxShadow: 6,
									transform: "translateY(-4px)",
								},
							}}
							onClick={() => navigate(link.path)}
						>
							<CardContent sx={{ flexGrow: 1 }}>
								<Box sx={{ mb: 1 }}>
									<Typography
										variant="caption"
										sx={{
											display: "inline-block",
											px: 1.5,
											py: 0.5,
											bgcolor: "primary.light",
											color: "primary.dark",
											borderRadius: 1,
											fontWeight: "bold",
										}}
									>
										Screen {link.screen}
									</Typography>
								</Box>
								<Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
									{link.label}
								</Typography>
								<Typography variant="body2" color="textSecondary">
									{link.description}
								</Typography>
							</CardContent>
						</Card>
					))}
				</Box>
			</Container>
		</Box>
	);
}

export default Dashboard;
