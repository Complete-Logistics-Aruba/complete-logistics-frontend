/**
 * Screen 9: Pending Shipping Orders
 *
 * WH user sees list of shipping orders waiting to be picked or loaded.
 * Clicks on an order to start the picking workflow (if Pending/Picking)
 * or loading workflow (if Loading).
 *
 * Story 6.0 Acceptance Criteria:
 * 1. Display shipping orders with status=Pending, Picking, or Loading
 * 2. Show as cards: Order ID, Shipment Type, Status, Items Count
 * 3. Cards are clickable → navigate to appropriate screen
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
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

import { shippingOrders } from "../../lib/api/wms-api";
import { supabase } from "../../lib/auth/supabase-client";
import type { ShippingOrder } from "../../types/domain";

interface ShippingOrderCard {
	id: string;
	order_ref: string;
	shipment_type: string;
	status: string;
	itemsCount: number;
	created_at: string;
	hasStagedPallets?: boolean;
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
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [orderToCancel, setOrderToCancel] = useState<ShippingOrderCard | null>(null);
	const [isCancelling, setIsCancelling] = useState(false);

	// Load pending shipping orders
	useEffect(() => {
		const loadOrders = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Fetch all shipping orders
				const allOrders = await shippingOrders.getAll();

				// Filter for Pending, Picking, or Loading status
				let pendingOrders = allOrders.filter((order: ShippingOrder) =>
					["Pending", "Picking", "Loading"].includes(order.status)
				);

				// Also add Completed orders that have Staged pallets (cancelled manifest scenario)
				const completedOrdersWithStaged: ShippingOrder[] = [];
				for (const order of allOrders.filter((order: ShippingOrder) => order.status === "Completed")) {
					const { data: stagedPallets } = await supabase
						.from("pallets")
						.select("id")
						.eq("shipping_order_id", order.id)
						.eq("status", "Staged")
						.limit(1);

					if (stagedPallets && stagedPallets.length > 0) {
						completedOrdersWithStaged.push(order);
					}
				}

				pendingOrders = [...pendingOrders, ...completedOrdersWithStaged];

				// Build card data with item counts
				const cardData: ShippingOrderCard[] = pendingOrders.map((order: ShippingOrder) => {
					// Count items from order.lines if available
					const itemsCount = order.lines ? order.lines.length : 0;

					// Check if this is a Completed order with Staged pallets (cancelled manifest scenario)
					const hasStagedPallets =
						order.status === "Completed" &&
						completedOrdersWithStaged.some((completedOrder) => completedOrder.id === order.id);

					return {
						id: order.id,
						order_ref: order.order_ref,
						shipment_type: order.shipment_type,
						status: order.status,
						itemsCount,
						created_at: order.created_at,
						hasStagedPallets,
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

	const handleOrderClick = async (order: ShippingOrderCard) => {
		// Smart Skip Logic: Check RemainingQty to determine if picking is needed
		try {
			// Get order lines to calculate requested quantities
			const { data: orderLines, error: linesError } = await supabase
				.from("shipping_order_lines")
				.select("item_id, requested_qty")
				.eq("shipping_order_id", order.id);

			if (linesError) throw linesError;

			// Get all pallets assigned to this order to calculate picked quantities
			const { data: assignedPallets, error: palletsError } = await supabase
				.from("pallets")
				.select("item_id, qty")
				.eq("shipping_order_id", order.id);

			if (palletsError) throw palletsError;

			// Calculate total requested vs total picked
			const requestedMap = new Map();
			const pickedMap = new Map();

			// Build requested quantities map
			for (const line of orderLines || []) {
				requestedMap.set(line.item_id, line.requested_qty);
			}

			// Build picked quantities map
			for (const pallet of assignedPallets || []) {
				const current = pickedMap.get(pallet.item_id) || 0;
				pickedMap.set(pallet.item_id, current + pallet.qty);
			}

			// Calculate remaining quantity
			let totalRequested = 0;
			let totalPicked = 0;

			for (const [itemId, requested] of requestedMap) {
				const picked = pickedMap.get(itemId) || 0;
				totalRequested += requested;
				totalPicked += Math.min(picked, requested); // Don't count over-picks
			}

			const remainingQty = totalRequested - totalPicked;

			// Smart Skip Logic: If RemainingQty <= 0, skip picking and go to loading
			if (order.status === "Loading" || remainingQty <= 0) {
				// Update order status to Loading if not already (for fully cross-docked orders)
				if (order.status !== "Loading") {
					await shippingOrders.update(order.id, { status: "Loading" });

					// Update local state to reflect the change
					setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "Loading" } : o)));

					enqueueSnackbar("Order fully cross-docked. Proceeding to loading.", { variant: "info" });
				}

				// Go to Screen 11 (Load Target Selection) for loading
				navigate("/warehouse/select-load-target", {
					state: { shippingOrderId: order.id },
				});
			} else {
				// Go to Screen 10 (Pick Pallets) for picking
				navigate("/warehouse/pick-pallets", {
					state: { shippingOrderId: order.id },
				});
			}
		} catch (error) {
			console.error("Error calculating remaining quantity:", error);
			// Fallback to status-based routing
			if (order.status === "Loading") {
				navigate("/warehouse/select-load-target", {
					state: { shippingOrderId: order.id },
				});
			} else {
				navigate("/warehouse/pick-pallets", {
					state: { shippingOrderId: order.id },
				});
			}
		}
	};

	const handleCloseClearDialog = () => {
		setClearDialogOpen(false);
	};

	const handleOpenCancelDialog = (order: ShippingOrderCard, event: React.MouseEvent) => {
		event.stopPropagation(); // Prevent card click navigation
		setOrderToCancel(order);
		setCancelDialogOpen(true);
	};

	const handleCloseCancelDialog = () => {
		setCancelDialogOpen(false);
		setOrderToCancel(null);
	};

	const handleConfirmCancel = async () => {
		if (!orderToCancel) return;

		try {
			setIsCancelling(true);

			// Call API to cancel order and release pallets
			await shippingOrders.cancelOrder(orderToCancel.id);

			enqueueSnackbar(`Order ${orderToCancel.order_ref} cancelled successfully. Pallets released for put-away.`, {
				variant: "success",
			});

			// Remove cancelled order from list
			setOrders((prev) => prev.filter((o) => o.id !== orderToCancel.id));

			handleCloseCancelDialog();
		} catch (error_) {
			console.error("Error cancelling order:", error_);
			const message = error_ instanceof Error ? error_.message : "Failed to cancel order";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsCancelling(false);
		}
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
					📋 Active Shipping Orders
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
							No Active Orders
						</Typography>
						<Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
							All shipping orders have been completed or there are no active orders. Completed orders with cancelled
							manifests will appear here for reloading.
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
							{orders.length} active order{orders.length === 1 ? "" : "s"}
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
									onClick={() => handleOrderClick(order)}
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
												color={
													order.status === "Pending"
														? "warning"
														: order.status === "Picking"
															? "info"
															: order.status === "Loading" || (order.status === "Completed" && order.hasStagedPallets)
																? "secondary"
																: "default"
												}
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
											{order.status === "Loading" || (order.status === "Completed" && order.hasStagedPallets)
												? "Start Loading →"
												: "Start Picking →"}
										</Button>

										{/* Cancel Order Button - Show for all statuses */}
										<Button
											fullWidth
											variant="outlined"
											color="error"
											size="small"
											startIcon={<XCircleIcon size={16} />}
											onClick={(e) => handleOpenCancelDialog(order, e)}
											sx={{
												mt: 1,
												fontSize: { xs: "0.75rem", sm: "0.8rem", md: "0.875rem" },
												py: { xs: 0.75, sm: 1 },
											}}
										>
											Cancel Order
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

			{/* Cancel Order Confirmation Dialog */}
			<Dialog
				open={cancelDialogOpen}
				onClose={handleCloseCancelDialog}
				aria-labelledby="cancel-dialog-title"
				aria-describedby="cancel-dialog-description"
			>
				<DialogTitle id="cancel-dialog-title">Cancel Order {orderToCancel?.order_ref}?</DialogTitle>
				<DialogContent>
					<DialogContentText id="cancel-dialog-description">
						This will cancel the shipping order and release all assigned pallets back to inventory (status = Received).
						The pallets will need to be put away again.
						<br />
						<br />
						<strong>This action cannot be undone.</strong>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCancelDialog} disabled={isCancelling}>
						No, Keep Order
					</Button>
					<Button onClick={handleConfirmCancel} disabled={isCancelling} color="error" variant="contained">
						{isCancelling ? <CircularProgress size={20} /> : "Yes, Cancel Order"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
