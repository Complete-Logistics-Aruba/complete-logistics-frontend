/**
 * Screen 9: Pending Shipping Orders
 *
 * WH user sees list of shipping orders waiting to be picked.
 * Clicks on an order to start the picking workflow.
 *
 * Story 6.0 Acceptance Criteria:
 * 1. Display shipping orders with status=Pending or Picking
 * 2. Show as cards: Order ID, Shipment Type, Status, Items Count
 * 3. Cards are clickable → navigate to Screen 10
 * 4. Loading state while fetching
 * 5. Empty state if no pending orders
 * 6. Error handling
 */

import React, { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Typography,
} from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

import { shippingOrders } from "../../lib/api/wms-api";
import type { ShippingOrder } from "../../types/domain";

interface ShippingOrderCard {
	id: string;
	order_ref: string;
	shipment_type: string;
	status: string;
	itemsCount: number;
	created_at: string;
}

const handleRetry = () => {
	globalThis.location.reload();
};

export default function Screen9() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();

	const [isLoading, setIsLoading] = useState(true);
	const [orders, setOrders] = useState<ShippingOrderCard[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const [isClearing] = useState(false);

	// Load pending shipping orders
	useEffect(() => {
		const loadOrders = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Fetch all shipping orders
				const allOrders = await shippingOrders.getAll();

				// Filter for Pending or Picking status
				const pendingOrders = allOrders.filter((order: ShippingOrder) => ["Pending", "Picking"].includes(order.status));

				// Build card data with item counts
				const cardData: ShippingOrderCard[] = pendingOrders.map((order: ShippingOrder) => {
					// Count items from order.lines if available
					const itemsCount = order.lines ? order.lines.length : 0;
					return {
						id: order.id,
						order_ref: order.order_ref,
						shipment_type: order.shipment_type,
						status: order.status,
						itemsCount,
						created_at: order.created_at,
					};
				});

				setOrders(cardData);
			} catch (error_) {
				console.error("Error loading orders:", error_);
				const message = error_ instanceof Error ? error_.message : "Failed to load orders";
				setError(message);
				enqueueSnackbar(`Error: ${message}`, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadOrders();
	}, [enqueueSnackbar]);

	const handleOrderClick = (orderId: string) => {
		navigate("/warehouse/pick-pallets", {
			state: { shippingOrderId: orderId },
		});
	};

	const handleCloseClearDialog = () => {
		setClearDialogOpen(false);
	};

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box sx={{ p: { xs: 2, sm: 3, md: 4 }, minHeight: "100vh", width: "100%" }}>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", mb: { xs: 2, sm: 3, md: 4 }, gap: 2, flexWrap: "wrap" }}>
				<Button
					startIcon={<ArrowLeftIcon size={20} />}
					onClick={() => navigate(-1)}
					sx={{
						minWidth: "auto",
						fontSize: { xs: "0.875rem", sm: "1rem" },
					}}
				>
					Back
				</Button>
				<Typography
					variant="h4"
					sx={{
						flex: 1,
						fontWeight: "bold",
						fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
						minWidth: "200px",
					}}
				>
					📋 Pending Shipping Orders
				</Typography>
			</Box>

			{/* Error State */}
			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
					<Button size="small" onClick={handleRetry} sx={{ ml: 2 }}>
						Retry
					</Button>
				</Alert>
			)}

			{/* Empty State */}
			{orders.length === 0 && !error ? (
				<Card sx={{ mt: { xs: 2, sm: 3 } }}>
					<CardContent sx={{ textAlign: "center", p: { xs: 3, sm: 4, md: 5 } }}>
						<Typography
							variant="h6"
							color="textSecondary"
							sx={{
								mb: 1,
								fontSize: { xs: "1rem", sm: "1.25rem" },
							}}
						>
							No Pending Orders
						</Typography>
						<Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
							All shipping orders have been picked or there are no orders waiting.
						</Typography>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Order Count */}
					{orders.length > 0 && (
						<Typography
							variant="body2"
							color="textSecondary"
							sx={{
								mb: 2,
								fontSize: { xs: "0.875rem", sm: "1rem" },
							}}
						>
							{orders.length} order{orders.length === 1 ? "" : "s"} waiting to be picked
						</Typography>
					)}

					{/* Orders Grid - Responsive */}
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr", // Mobile: 1 column
								sm: "repeat(2, 1fr)", // Tablet: 2 columns
								md: "repeat(3, 1fr)", // Desktop: 3 columns
								lg: "repeat(4, 1fr)", // Large desktop: 4 columns
							},
							gap: { xs: 1.5, sm: 2, md: 2.5 },
						}}
					>
						{orders.map((order) => (
							<Box key={order.id}>
								<Card
									onClick={() => handleOrderClick(order.id)}
									sx={{
										cursor: "pointer",
										transition: "all 0.3s ease",
										height: "100%",
										display: "flex",
										flexDirection: "column",
										"&:hover": {
											boxShadow: 4,
											transform: "translateY(-4px)",
										},
										"&:active": {
											transform: "translateY(-2px)",
										},
									}}
								>
									<CardContent
										sx={{
											flex: 1,
											display: "flex",
											flexDirection: "column",
											p: { xs: 2, sm: 2.5, md: 3 },
										}}
									>
										{/* Order Ref */}
										<Typography
											variant="h6"
											sx={{
												fontWeight: "bold",
												mb: 1.5,
												fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
												wordBreak: "break-word",
											}}
										>
											{order.order_ref}
										</Typography>

										{/* Status Chip */}
										<Box sx={{ mb: 2 }}>
											<Chip
												label={order.status}
												color={order.status === "Pending" ? "warning" : "info"}
												size="small"
												variant="outlined"
												sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
											/>
										</Box>

										{/* Shipment Type */}
										<Typography
											variant="body2"
											color="textSecondary"
											sx={{
												mb: 1,
												fontSize: { xs: "0.8rem", sm: "0.875rem", md: "1rem" },
											}}
										>
											<strong>Type:</strong> {order.shipment_type.replaceAll("_", " ")}
										</Typography>

										{/* Created Date */}
										<Typography
											variant="body2"
											color="textSecondary"
											sx={{
												mb: 1,
												fontSize: { xs: "0.8rem", sm: "0.875rem", md: "1rem" },
											}}
										>
											<strong>Created:</strong> {new Date(order.created_at).toLocaleDateString()}
										</Typography>

										{/* Items Count */}
										<Typography
											variant="body2"
											color="textSecondary"
											sx={{
												mb: 2,
												fontSize: { xs: "0.8rem", sm: "0.875rem", md: "1rem" },
											}}
										>
											<strong>Items:</strong> {order.itemsCount}
										</Typography>

										{/* Click to Start Button */}
										<Button
											fullWidth
											variant="contained"
											color="primary"
											size="small"
											sx={{
												mt: "auto",
												fontSize: { xs: "0.8rem", sm: "0.875rem", md: "1rem" },
												py: { xs: 1, sm: 1.25 },
											}}
										>
											Start Picking →
										</Button>
									</CardContent>
								</Card>
							</Box>
						))}
					</Box>
				</>
			)}

			{/* Clear Data Confirmation Dialog */}
			<Dialog
				open={clearDialogOpen}
				onClose={handleCloseClearDialog}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">Clear All Pending Orders?</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						This will remove all pending shipping orders. This action cannot be undone. Are you sure you want to
						continue?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseClearDialog} disabled={isClearing}>
						Cancel
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
