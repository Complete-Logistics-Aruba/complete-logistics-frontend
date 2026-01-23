/**
 * Screen 7: Pallet Tallying with SHIP-NOW Logic
 *
 * WH user generates and confirms pallet records from receiving quantities.
 * Allows editing qty per pallet and creates inventory baseline.
 * Supports SHIP-NOW cross-dock logic for items already ordered.
 *
 * Story 3.2 Acceptance Criteria:
 * 1. Display pallet rows: Item ID, Description, Qty (editable)
 * 2. Calculate expected pallets = expected_qty / units_per_pallet
 * 3. Allow editing qty per pallet
 * 4. [Confirm Pallet] button creates pallet record
 * 5. [Undo] button deletes pallet and re-opens row
 * 6. Visual feedback for confirmed rows (green/dimmed)
 * 7. [Finish Tally] button sets receiving_order.status=Staged
 *
 * Story 3.3 Acceptance Criteria (SHIP-NOW):
 * 1. Calculate RemainingQty for each item across shipping_orders (Pending/Picking)
 * 2. RemainingQty = requested_qty - SUM(assigned pallets)
 * 3. Show [SHIP-NOW] button if RemainingQty > 0 for at least one order
 * 4. [SHIP-NOW] creates cross-dock pallet (status=Received, is_cross_dock=true)
 * 5. Cross-dock pallet skips Put-Away and Picking; appears in Loading (Screen 12)
 * 6. Set is_cross_dock=true for billing segmentation
 */

import React, { useEffect, useState } from "react";
import {
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { RocketIcon } from "@phosphor-icons/react/dist/ssr/Rocket";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";

import {
	pallets,
	products,
	receivingOrderLines,
	receivingOrders,
	shippingOrders as shippingOrdersApi,
} from "../../lib/api/wms-api";
import {
	Pallet,
	Product,
	ReceivingOrder,
	ReceivingOrderLine,
	ShippingOrder,
	ShippingOrderLine,
} from "../../types/domain";

interface PalletRow {
	line: ReceivingOrderLine;
	product: Product;
	qtyPerPallet: number;
	actualQty: number; // Actual qty for this specific pallet (may differ from units_per_pallet for last pallet)
	expectedPallets: number;
	confirmedPallets: Pallet[];
	isEditing: boolean;
	remainingQtyByOrder?: { orderId: string; remainingQty: number }[];
	hasShipNowOption?: boolean;
	totalRemainingQty?: number; // Total remaining qty across all shipping orders for this item
	canShipNow?: boolean; // Whether this specific pallet can be shipped now
}

interface ShippingOrderWithLines extends ShippingOrder {
	lines?: ShippingOrderLine[];
}

export default function Screen7() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

	const { receivingOrderId, containerNum, sealNum } = location.state || {};

	const [receivingOrder, setReceivingOrder] = useState<ReceivingOrder | null>(null);
	const [rows, setRows] = useState<PalletRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingQty, setEditingQty] = useState<{ [key: string]: number }>({});
	const [shippingOrders, setShippingOrders] = useState<ShippingOrderWithLines[]>([]);
	const [shipNowOrderId, setShipNowOrderId] = useState<string | null>(null); // Track if SHIP-NOW was used
	const [totalPalletsCreated, setTotalPalletsCreated] = useState(0);
	const [confirmingPalletIndex, setConfirmingPalletIndex] = useState<number | null>(null);

	// Load receiving order and lines
	useEffect(() => {
		const loadData = async () => {
			if (!receivingOrderId) {
				console.error("❌ [SCREEN 7 LOAD] No receiving order ID provided!");
				enqueueSnackbar("No receiving order selected", { variant: "error" });
				navigate("/warehouse");
				return;
			}

			try {
				setIsLoading(true);
				// Fetch receiving order
				const order = await receivingOrders.getById(receivingOrderId);
				setReceivingOrder(order);

				// Fetch receiving order lines
				const lines = await receivingOrderLines.getByReceivingOrderId(receivingOrderId);

				// Fetch all shipping orders with lines for SHIP-NOW logic
				const allShippingOrders = await shippingOrdersApi.getAll();
				const shippingOrdersWithLines: ShippingOrderWithLines[] = [];
				for (const so of allShippingOrders) {
					if (so.status === "Pending" || so.status === "Picking") {
						const soWithLines = await shippingOrdersApi.getById(so.id);
						shippingOrdersWithLines.push(soWithLines);
					}
				}
				setShippingOrders(shippingOrdersWithLines);

				// Fetch products and build rows - ONE ROW PER INDIVIDUAL PALLET
				const rowsData: PalletRow[] = [];
				const editingQtyMap: { [key: string]: number } = {};

				for (const line of lines) {
					const product = await products.getByItemId(line.item_id);
					const expectedPallets = Math.ceil(line.expected_qty / product.units_per_pallet);

					// Fetch pallets for this item from the CURRENT receiving order only (scoped validation)
					const allPalletsForItem = await pallets.getAll();
					const confirmedPalletsForItem = allPalletsForItem.filter(
						(p) => p.item_id === product.item_id && p.receiving_order_id === receivingOrderId
					);
					// Calculate RemainingQty for each shipping order
					const remainingQtyByOrder: { orderId: string; remainingQty: number }[] = [];
					let totalRemainingQty = 0;
					for (const so of shippingOrdersWithLines) {
						const soLine = so.lines?.find((l) => l.item_id === product.item_id);
						if (soLine) {
							// Calculate qty already assigned to this order
							const assignedQty = confirmedPalletsForItem
								.filter((p) => p.shipping_order_id === so.id)
								.reduce((sum, p) => sum + p.qty, 0);
							const remainingQty = soLine.requested_qty - assignedQty;
							if (remainingQty > 0) {
								remainingQtyByOrder.push({ orderId: so.id, remainingQty });
								totalRemainingQty += remainingQty;
							}
						}
					}

					const hasShipNowOption = remainingQtyByOrder.length > 0;

					// Create ONE ROW PER INDIVIDUAL PALLET (not one row per item)
					for (let palletIndex = 0; palletIndex < expectedPallets; palletIndex++) {
						const palletQty =
							palletIndex === expectedPallets - 1
								? line.expected_qty - palletIndex * product.units_per_pallet
								: product.units_per_pallet;

						// Use rowIndex as a key to match handleConfirmPallet
						const rowIndex = rowsData.length;
						const palletKey = `row-${rowIndex}`;

						// Determine if this specific pallet can be shipped now
						// Only enable SHIP-NOW for pallets that fit within the remaining quantity
						const canShipNow = totalRemainingQty >= palletQty;

						rowsData.push({
							line,
							product,
							qtyPerPallet: product.units_per_pallet,
							actualQty: palletQty, // Actual qty for this specific pallet
							expectedPallets: 1, // Each row represents 1 pallet
							confirmedPallets: [], // Start empty - will be populated as user confirms
							isEditing: false,
							remainingQtyByOrder,
							hasShipNowOption,
							totalRemainingQty,
							canShipNow,
						});

						// Build map instead of calling setState in loop
						editingQtyMap[palletKey] = palletQty;

						// Update remaining quantity for next pallet if this one can be shipped
						if (canShipNow) {
							totalRemainingQty -= palletQty;
						}
					}
				}

				// Set all editing quantities at once (not in loop)
				setEditingQty(editingQtyMap);
				setRows(rowsData);
			} catch (error) {
				console.error("❌ [SCREEN 7 LOAD] Error loading data:", error);
				console.error("  Error Type:", error instanceof Error ? error.constructor.name : typeof error);
				console.error("  Error Message:", error instanceof Error ? error.message : String(error));
				const message = error instanceof Error ? error.message : "Failed to load data";
				enqueueSnackbar(`Error: ${message}`, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [receivingOrderId, navigate, enqueueSnackbar]);

	// Handle qty change for individual pallet row
	const handleQtyChange = (palletKey: string, value: number) => {
		if (value > 0) {
			setEditingQty((prev) => ({
				...prev,
				[palletKey]: value,
			}));
		}
	};

	// Confirm pallet (each row = 1 individual pallet)
	const handleConfirmPallet = async (rowIndex: number) => {
		const row = rows[rowIndex];
		const palletKey = `row-${rowIndex}`;
		const qty = editingQty[palletKey] || row.actualQty;

		// Guard: Don't create if already confirmed
		if (row.confirmedPallets.length > 0) {
			console.warn("⚠️ [CONFIRM PALLET] This pallet is already confirmed! Skipping creation.");
			enqueueSnackbar("This pallet is already confirmed", { variant: "warning" });
			return;
		}

		// Guard: Prevent double-click/double-submission
		if (confirmingPalletIndex === rowIndex) {
			console.warn("⚠️ [CONFIRM PALLET] Already confirming this pallet! Skipping duplicate request.");
			return;
		}

		if (!qty || qty <= 0) {
			console.error("❌ [CONFIRM PALLET] Invalid qty:", qty);
			console.error("  editingQty[palletKey]:", editingQty[palletKey]);
			console.error("  row.actualQty:", row.actualQty);
			enqueueSnackbar("Qty must be greater than 0", { variant: "error" });
			return;
		}

		// CRITICAL VALIDATION: Prevent over-receiving (confirming more than ordered)
		// Fetch pallets for this item from the CURRENT receiving order only (scoped validation)
		const allPallets = await pallets.getAll();
		const allPalletsForItem = allPallets.filter(
			(p) => p.item_id === row.product.item_id && p.receiving_order_id === receivingOrderId
		);

		// Calculate total confirmed qty for this item in the current receiving order only
		const totalConfirmedForItem = allPalletsForItem.reduce((sum, p) => sum + p.qty, 0);

		const expectedQtyForItem = row.line.expected_qty;
		const newTotal = totalConfirmedForItem + qty;

		if (newTotal > expectedQtyForItem) {
			const remaining = expectedQtyForItem - totalConfirmedForItem;
			enqueueSnackbar(
				`Cannot confirm: Total qty (${newTotal}) would exceed ordered qty (${expectedQtyForItem}). Only ${remaining} units remaining.`,
				{ variant: "error" }
			);
			return;
		}

		try {
			setIsSubmitting(true);
			setConfirmingPalletIndex(rowIndex);

			// Allow multiple pallets for same item in same receiving order
			// Each row represents a separate pallet confirmation

			const palletData = {
				receiving_order_id: receivingOrderId,
				item_id: row.product.item_id,
				qty: Math.round(qty),
				status: "Received" as const,
				is_cross_dock: false,
			};

			// Create pallet
			const pallet = await pallets.create(palletData);
			// Update row - mark this individual pallet as confirmed
			const updatedRows = [...rows];
			updatedRows[rowIndex].confirmedPallets.push(pallet);
			updatedRows[rowIndex].isEditing = false;
			setRows(updatedRows);

			// Increment total pallets created
			setTotalPalletsCreated((prev) => prev + 1);
			enqueueSnackbar(`✅ Pallet confirmed (ID: ${pallet.id.slice(0, 8)})`, {
				variant: "success",
			});
		} catch (error) {
			console.error("❌ [CONFIRM PALLET] ERROR:", error);
			console.error("  Error Type:", error instanceof Error ? error.constructor.name : typeof error);
			console.error("  Error Message:", error instanceof Error ? error.message : String(error));
			console.error("  Full Error Object:", error);
			const message = error instanceof Error ? error.message : "Failed to confirm pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
			setConfirmingPalletIndex(null);
		}
	};

	// Undo pallet
	const handleUndoPallet = async (rowIndex: number, palletIndex: number) => {
		const row = rows[rowIndex];
		const pallet = row.confirmedPallets[palletIndex];

		try {
			setIsSubmitting(true);

			// Delete pallet
			await pallets.delete(pallet.id);

			// Update row
			const updatedRows = [...rows];
			updatedRows[rowIndex].confirmedPallets.splice(palletIndex, 1);
			updatedRows[rowIndex].isEditing = true;
			setRows(updatedRows);

			enqueueSnackbar("✅ Pallet undone", { variant: "success" });
		} catch (error) {
			console.error("Error undoing pallet:", error);
			const message = error instanceof Error ? error.message : "Failed to undo pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle SHIP-NOW (cross-dock)
	const handleShipNow = async (rowIndex: number) => {
		const row = rows[rowIndex];
		const palletKey = `row-${rowIndex}`;
		// Get the edited quantity if user changed it, otherwise use actualQty
		const editedQty = editingQty[palletKey];
		const qty = editedQty === undefined ? row.actualQty : editedQty;

		if (!qty || qty <= 0) {
			console.error("❌ [SHIP NOW] Invalid qty:", qty);
			enqueueSnackbar("Qty must be greater than 0", { variant: "error" });
			return;
		}

		// CRITICAL VALIDATION: Prevent over-receiving (same logic as Confirm Pallet)
		// Fetch pallets for this item from the CURRENT receiving order only (scoped validation)
		const allPallets = await pallets.getAll();
		const allPalletsForItem = allPallets.filter(
			(p) => p.item_id === row.product.item_id && p.receiving_order_id === receivingOrderId
		);

		// Calculate total confirmed qty for this item in the current receiving order only
		const totalConfirmedForItem = allPalletsForItem.reduce((sum, p) => sum + p.qty, 0);

		const expectedQtyForItem = row.line.expected_qty;
		const newTotal = totalConfirmedForItem + qty;

		if (newTotal > expectedQtyForItem) {
			const remaining = expectedQtyForItem - totalConfirmedForItem;
			enqueueSnackbar(
				`Cannot Ship-Now: Total qty (${newTotal}) would exceed ordered qty (${expectedQtyForItem}). Only ${remaining} units remaining.`,
				{ variant: "error" }
			);
			return;
		}

		if (!row.hasShipNowOption || !row.canShipNow || !row.remainingQtyByOrder || row.remainingQtyByOrder.length === 0) {
			console.warn("⚠️ [SHIP NOW] No SHIP-NOW option available or pallet cannot be shipped now");
			enqueueSnackbar(
				row.canShipNow === false
					? "Shipping order quantity fulfilled - cannot ship additional pallets"
					: "No shipping orders available for SHIP-NOW",
				{ variant: "warning" }
			);
			return;
		}

		try {
			setIsSubmitting(true);

			// Check if shippingOrders is loaded
			if (!shippingOrders || shippingOrders.length === 0) {
				console.warn("⚠️ [SHIP NOW] Shipping orders not loaded");
				enqueueSnackbar("Shipping orders not loaded yet. Please try again.", { variant: "warning" });
				setIsSubmitting(false);
				return;
			}

			// Find all eligible shipping orders for this item
			const eligibleOrders = shippingOrders.filter((order) => {
				if (order.status !== "Pending" && order.status !== "Picking") return false;
				if (!order.lines) return false;
				const line = order.lines.find((l) => l.item_id === row.product.item_id);
				return line && line.requested_qty > 0;
			});

			if (eligibleOrders.length === 0) {
				console.warn("⚠️ [SHIP NOW] No eligible shipping order found");
				enqueueSnackbar("No eligible shipping orders found for this item", { variant: "warning" });
				setIsSubmitting(false);
				return;
			}

			// Prioritize Container_Loading over Hand_Delivery, then sort by created_at (FIFO)
			const shipNowOrder = eligibleOrders.sort((a, b) => {
				// Container_Loading comes first
				if (a.shipment_type === "Container_Loading" && b.shipment_type !== "Container_Loading") return -1;
				if (a.shipment_type !== "Container_Loading" && b.shipment_type === "Container_Loading") return 1;
				// Then sort by created_at (FIFO)
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return dateA - dateB;
			})[0];

			// Create cross-dock pallet
			// Ensure receivingOrderId is a string for proper database storage
			const orderId = String(receivingOrderId);
			const pallet = await pallets.create({
				receiving_order_id: orderId,
				item_id: row.product.item_id,
				qty: Math.round(qty),
				status: "Staged",
				shipping_order_id: shipNowOrder.id,
				is_cross_dock: true,
				received_at: new Date().toISOString(), // Set received_at for cross-dock pallets
			});

			// Track the shipping order ID for navigation logic
			setShipNowOrderId(shipNowOrder.id);

			// Remove row from display
			const updatedRows = rows.filter((_, idx) => idx !== rowIndex);
			setRows(updatedRows);

			// Re-index editingQty to match new row indices after filtering
			const updatedEditingQty: { [key: string]: number } = {};
			let newRowIndex = 0;
			for (let i = 0; i < rows.length; i++) {
				if (i !== rowIndex) {
					// If this row had an edited quantity, preserve it with new index
					const oldKey = `row-${i}`;
					if (editingQty[oldKey] !== undefined) {
						updatedEditingQty[`row-${newRowIndex}`] = editingQty[oldKey];
					}
					newRowIndex++;
				}
			}
			setEditingQty(updatedEditingQty);

			// Increment total pallets created
			setTotalPalletsCreated((prev) => prev + 1);

			enqueueSnackbar(
				`✅ Cross-dock pallet created (ID: ${pallet.id.slice(0, 8)}) - Order: ${shipNowOrder.order_ref}`,
				{ variant: "success" }
			);
		} catch (error) {
			console.error("❌ [SHIP NOW] ERROR:", error);
			console.error("  Error Type:", error instanceof Error ? error.constructor.name : typeof error);
			console.error("  Error Message:", error instanceof Error ? error.message : String(error));
			console.error("  Full Error Object:", error);
			const message = error instanceof Error ? error.message : "Failed to create cross-dock pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Finish tally
	const handleFinishTally = async () => {
		if (totalPalletsCreated === 0) {
			console.warn("⚠️ [FINISH TALLY] No pallets created yet!");
			enqueueSnackbar(`Please confirm at least 1 pallet before finishing`, { variant: "warning" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Update receiving order status
			await receivingOrders.update(receivingOrderId, {
				status: "Staged",
			});

			// Check if ALL pallets were created via SHIP-NOW (100% cross-dock)
			// If there are any regular confirmed pallets, it's a mixed order
			const hasRegularPallets = rows.some((row) => row.confirmedPallets.length > 0);
			const isAllShipNow = totalPalletsCreated > 0 && !hasRegularPallets;

			// Only update shipping order to "Loading" if ALL pallets are SHIP-NOW (100% cross-dock)
			if (shipNowOrderId && isAllShipNow) {
				try {
					await shippingOrdersApi.update(shipNowOrderId, {
						status: "Loading",
					});
				} catch (error) {
					console.error("⚠️ Failed to update shipping order status:", error);
					// Don't fail the entire operation if shipping order update fails
					enqueueSnackbar("Warning: Shipping order status update failed, but tally was completed", {
						variant: "warning",
					});
				}
			}

			// Show validation message
			let successMessage =
				`✅ Tally Validation Successful!\n` +
				`Order: ${receivingOrderId}\n` +
				`Total Pallets: ${totalPalletsCreated}\n` +
				`Status: Staged`;

			if (shipNowOrderId) {
				successMessage += isAllShipNow
					? `\nShipping Order: ${shipNowOrderId} (Loading - 100% Cross-Dock)`
					: `\nShipping Order: ${shipNowOrderId} (Partial - Needs Picking)`;
			}

			enqueueSnackbar(successMessage, {
				variant: "success",
				autoHideDuration: 4000,
			});

			// Clear pallet rows after successful finish
			setRows([]);

			// Navigate based on fulfillment type
			if (shipNowOrderId && isAllShipNow) {
				// 100% cross-dock: Go directly to Screen 11 (Load Target Selection)
				navigate("/warehouse/select-load-target", {
					state: {
						shippingOrderId: shipNowOrderId,
					},
				});
			} else {
				// Mixed order or regular order: Go to dashboard (user will use Screen 9 to start picking)
				navigate("/warehouse");
			}
		} catch (error) {
			console.error("❌ [FINISH TALLY] ERROR:", error);
			console.error("  Error Type:", error instanceof Error ? error.constructor.name : typeof error);
			console.error("  Error Message:", error instanceof Error ? error.message : String(error));
			console.error("  Full Error Object:", error);
			const message = error instanceof Error ? error.message : "Failed to finish tally";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
				<CircularProgress />
			</Box>
		);
	}

	if (!receivingOrder) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="error">Receiving order not found</Typography>
			</Box>
		);
	}

	// Each row = 1 individual pallet
	const totalExpected = rows.length; // Total rows = total pallets expected
	const totalConfirmed = rows.filter((row) => row.confirmedPallets.length > 0).length; // Rows with confirmed pallets
	// Enable finish if ANY pallets have been confirmed OR shipped via SHIP-NOW
	const isFinishEnabled = totalConfirmed > 0 || totalPalletsCreated > 0;

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
				<Button startIcon={<ArrowLeftIcon size={20} />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
					Back
				</Button>
				<Typography
					variant="h5"
					sx={{
						fontWeight: "bold",
						fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
					}}
				>
					Pallet Tallying
				</Typography>
			</Box>

			{/* Order Info */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
							gap: { xs: 1.5, sm: 2 },
						}}
					>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Container #
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: "bold" }}>
								{containerNum}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Seal #
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: "bold" }}>
								{sealNum}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Status
							</Typography>
							<Chip
								label={receivingOrder.status}
								size="small"
								sx={{
									mt: 0.5,
									backgroundColor:
										receivingOrder.status === "Unloading"
											? "#fff3e0"
											: receivingOrder.status === "Staged"
												? "#e8f5e9"
												: receivingOrder.status === "Received"
													? "#e3f2fd"
													: "#f5f5f5",
									color:
										receivingOrder.status === "Unloading"
											? "#e65100"
											: receivingOrder.status === "Staged"
												? "#2e7d32"
												: receivingOrder.status === "Received"
													? "#1565c0"
													: "#666",
									fontWeight: 600,
									fontSize: "0.875rem",
								}}
							/>
						</Box>
					</Box>
				</CardContent>
			</Card>

			{/* Pallet Table */}
			<TableContainer component={Paper} sx={{ mb: 3, overflowX: "auto" }}>
				<Table size={isTablet ? "small" : "medium"}>
					<TableHead>
						<TableRow sx={{ backgroundColor: "#f5f5f5" }}>
							<TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Item ID</TableCell>
							<TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Description</TableCell>
							<TableCell align="right">Qty/Pallet</TableCell>
							<TableCell align="center">Actions</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{rows
							.map((row, rowIndex) => ({ row, rowIndex }))
							.map(({ row, rowIndex }) => {
								const palletKey = `row-${rowIndex}`;
								const isConfirmed = row.confirmedPallets.length > 0;

								return (
									<TableRow
										key={palletKey}
										sx={{
											backgroundColor: isConfirmed ? "rgba(76, 175, 80, 0.15)" : "white",
											opacity: isConfirmed ? 0.8 : 1,
											borderLeft: isConfirmed ? "4px solid #4caf50" : "none",
										}}
									>
										<TableCell
											sx={{ display: { xs: "none", sm: "table-cell" }, fontSize: { xs: "0.875rem", sm: "1rem" } }}
										>
											{row.product.item_id}
										</TableCell>
										<TableCell
											sx={{ display: { xs: "none", md: "table-cell" }, fontSize: { xs: "0.875rem", sm: "1rem" } }}
										>
											{row.product.description}
										</TableCell>
										<TableCell align="right" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
											{isConfirmed ? (
												<Typography variant="body2" sx={{ fontWeight: "bold" }}>
													{row.confirmedPallets[0].qty}
												</Typography>
											) : (
												<TextField
													type="number"
													size="small"
													value={editingQty[palletKey] === undefined ? row.qtyPerPallet : editingQty[palletKey]}
													onChange={(e) => handleQtyChange(palletKey, Number.parseInt(e.target.value) || 0)}
													inputProps={{ min: 1 }}
													sx={{ width: "80px" }}
												/>
											)}
										</TableCell>
										<TableCell align="center">
											<Box
												sx={{ display: "flex", gap: { xs: 0.5, sm: 1 }, justifyContent: "center", flexWrap: "wrap" }}
											>
												{isConfirmed ? (
													<Button
														size="small"
														variant="outlined"
														color="error"
														startIcon={<TrashIcon size={16} />}
														onClick={() => handleUndoPallet(rowIndex, 0)}
														disabled={isSubmitting}
													>
														Undo
													</Button>
												) : (
													<>
														<Button
															size="small"
															variant="contained"
															startIcon={<CheckCircleIcon size={16} />}
															onClick={() => handleConfirmPallet(rowIndex)}
															disabled={isSubmitting}
															sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
															title="Confirm this pallet"
														>
															{isTablet ? "OK" : "Confirm"}
														</Button>
														{row.hasShipNowOption && (
															<Button
																size="small"
																variant="contained"
																color="warning"
																startIcon={<RocketIcon size={16} />}
																onClick={() => handleShipNow(rowIndex)}
																disabled={isSubmitting || !row.canShipNow}
																title={
																	row.canShipNow
																		? `Ship-Now to ${row.remainingQtyByOrder?.length || 0} order(s)`
																		: `Shipping order quantity fulfilled - cannot ship additional pallets`
																}
															>
																Ship-Now
															</Button>
														)}
													</>
												)}
											</Box>
										</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Summary & Actions */}
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: { xs: "flex-start", sm: "center" },
					flexDirection: { xs: "column", sm: "row" },
					gap: { xs: 2, sm: 0 },
				}}
			>
				<Box>
					<Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
						Total Pallets Confirmed:{" "}
						<strong>
							{totalConfirmed}/{totalExpected}
						</strong>
					</Typography>
					{totalConfirmed < totalExpected && (
						<Typography variant="caption" color="info.main" sx={{ display: "block", mt: 0.5 }}>
							ℹ️ {totalExpected - totalConfirmed} pallets remaining
						</Typography>
					)}
				</Box>
				<Button
					variant="contained"
					color="success"
					size={isTablet ? "medium" : "large"}
					onClick={handleFinishTally}
					disabled={!isFinishEnabled || isSubmitting}
					sx={{ width: { xs: "100%", sm: "auto" } }}
				>
					{isSubmitting ? <CircularProgress size={24} /> : "Finish Tally"}
				</Button>
			</Box>
		</Box>
	);
}
