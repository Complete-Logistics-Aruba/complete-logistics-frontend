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
	Container,
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
	getShipNowOrder,
	pallets,
	products,
	receivingOrderLines,
	receivingOrders,
	shippingOrders as shippingOrdersApi,
} from "../../lib/api/wms-api";
import { useAuth } from "../../lib/auth/auth-context";
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
	expectedPallets: number;
	confirmedPallets: Pallet[];
	isEditing: boolean;
	remainingQtyByOrder?: { orderId: string; remainingQty: number }[];
	hasShipNowOption?: boolean;
}

interface ShippingOrderWithLines extends ShippingOrder {
	lines?: ShippingOrderLine[];
}

export default function Screen7() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const { user } = useAuth();
	const theme = useTheme();
	const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

	const { receivingOrderId, containerNum, sealNum } = location.state || {};

	const [receivingOrder, setReceivingOrder] = useState<ReceivingOrder | null>(null);
	const [rows, setRows] = useState<PalletRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingQty, setEditingQty] = useState<{ [key: string]: number }>({});
	const [shippingOrders, setShippingOrders] = useState<ShippingOrderWithLines[]>([]);

	// Load receiving order and lines
	useEffect(() => {
		const loadData = async () => {
			if (!receivingOrderId) {
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

				// Fetch products and build rows
				const rowsData: PalletRow[] = [];
				for (const line of lines) {
					const product = await products.getByItemId(line.item_id);
					const expectedPallets = Math.ceil(line.expected_qty / product.units_per_pallet);

					// Fetch confirmed pallets for this specific item
					const allPallets = await pallets.getFiltered({
						receiving_order_id: receivingOrderId,
					});
					const confirmedPallets = allPallets;

					// Calculate RemainingQty for each shipping order
					const remainingQtyByOrder: { orderId: string; remainingQty: number }[] = [];
					for (const so of shippingOrdersWithLines) {
						const soLine = so.lines?.find((l) => l.item_id === product.item_id);
						if (soLine) {
							// Calculate qty already assigned to this order
							const assignedQty = confirmedPallets
								.filter((p) => p.shipping_order_id === so.id && p.item_id === product.item_id)
								.reduce((sum, p) => sum + p.qty, 0);
							const remainingQty = soLine.requested_qty - assignedQty;
							if (remainingQty > 0) {
								remainingQtyByOrder.push({ orderId: so.id, remainingQty });
							}
						}
					}

					const hasShipNowOption = remainingQtyByOrder.length > 0;

					rowsData.push({
						line,
						product,
						qtyPerPallet: product.units_per_pallet,
						expectedPallets,
						confirmedPallets: confirmedPallets.filter(
							(p) => p.receiving_order_id === receivingOrderId && p.item_id === product.item_id
						),
						isEditing: false,
						remainingQtyByOrder,
						hasShipNowOption,
					});

					setEditingQty((prev) => ({
						...prev,
						[line.id]: product.units_per_pallet,
					}));
				}

				setRows(rowsData);
			} catch (error) {
				console.error("Error loading data:", error);
				const message = error instanceof Error ? error.message : "Failed to load data";
				enqueueSnackbar(`Error: ${message}`, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [receivingOrderId, navigate, enqueueSnackbar]);

	// Handle qty change
	const handleQtyChange = (lineId: string, value: number) => {
		if (value > 0) {
			setEditingQty((prev) => ({
				...prev,
				[lineId]: value,
			}));
		}
	};

	// Confirm pallet
	const handleConfirmPallet = async (rowIndex: number) => {
		const row = rows[rowIndex];
		const qty = editingQty[row.line.id];

		if (!qty || qty <= 0) {
			enqueueSnackbar("Qty must be greater than 0", { variant: "error" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Create pallet
			const pallet = await pallets.create({
				receiving_order_id: receivingOrderId,
				item_id: row.product.item_id,
				qty,
				status: "Received",
				is_cross_dock: false,
			});

			// Update row
			const updatedRows = [...rows];
			updatedRows[rowIndex].confirmedPallets.push(pallet);
			updatedRows[rowIndex].isEditing = false;
			setRows(updatedRows);

			enqueueSnackbar(`✅ Pallet confirmed (ID: ${pallet.id.slice(0, 8)})`, {
				variant: "success",
			});
		} catch (error) {
			console.error("Error confirming pallet:", error);
			const message = error instanceof Error ? error.message : "Failed to confirm pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
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
		const qty = editingQty[row.line.id];

		if (!qty || qty <= 0) {
			enqueueSnackbar("Qty must be greater than 0", { variant: "error" });
			return;
		}

		if (!row.hasShipNowOption || !row.remainingQtyByOrder || row.remainingQtyByOrder.length === 0) {
			enqueueSnackbar("No shipping orders available for SHIP-NOW", { variant: "warning" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Use getShipNowOrder to find the earliest order (FIFO)
			const shipNowOrder = await getShipNowOrder(row.product.id, shippingOrders);

			if (!shipNowOrder) {
				enqueueSnackbar("No eligible shipping orders found", { variant: "warning" });
				return;
			}

			// Create cross-dock pallet
			const pallet = await pallets.create({
				receiving_order_id: receivingOrderId,
				item_id: row.product.item_id,
				qty,
				status: "Received",
				shipping_order_id: shipNowOrder.id,
				is_cross_dock: true,
			});

			// Remove row from display
			const updatedRows = rows.filter((_, idx) => idx !== rowIndex);
			setRows(updatedRows);

			enqueueSnackbar(
				`✅ Cross-dock pallet created (ID: ${pallet.id.slice(0, 8)}) - Order: ${shipNowOrder.id.slice(0, 8)}`,
				{ variant: "success" }
			);
		} catch (error) {
			console.error("Error creating cross-dock pallet:", error);
			const message = error instanceof Error ? error.message : "Failed to create cross-dock pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Finish tally
	const handleFinishTally = async () => {
		const totalExpected = rows.reduce((sum, row) => sum + row.expectedPallets, 0);
		const totalConfirmed = rows.reduce((sum, row) => sum + row.confirmedPallets.length, 0);

		// Allow finishing with at least 1 pallet confirmed (partial completion allowed)
		if (totalConfirmed === 0 || totalExpected === 0) {
			enqueueSnackbar(`Please confirm at least 1 pallet before finishing`, { variant: "warning" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Update receiving order status
			await receivingOrders.update(receivingOrderId, {
				status: "Staged",
			});

			// Role-based navigation
			if (user?.role === "Warehouse") {
				// Warehouse User: Show toast and navigate to Screen 5 (Pending Receipts)
				enqueueSnackbar("✅ Pallets tallied successfully! Awaiting Customer Service review.", {
					variant: "success",
				});

				setTimeout(() => {
					navigate("/warehouse/screen-5");
				}, 1500);
			} else if (user?.role === "Customer Service") {
				// Customer Service User: Navigate to Screen 2 (Receiving Summary)
				enqueueSnackbar("✅ Tally finished! Order status set to Staged", {
					variant: "success",
				});

				setTimeout(() => {
					navigate("/warehouse/screen-2", {
						state: {
							receivingOrderId,
							containerNum,
							sealNum,
						},
					});
				}, 1500);
			} else {
				// Unknown role
				enqueueSnackbar("✅ Tally finished! Order status set to Staged", {
					variant: "success",
				});
				setTimeout(() => {
					navigate("/warehouse");
				}, 1500);
			}
		} catch (error) {
			console.error("Error finishing tally:", error);
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

	const totalExpected = rows.reduce((sum, row) => sum + row.expectedPallets, 0);
	const totalConfirmed = rows.reduce((sum, row) => sum + row.confirmedPallets.length, 0);
	const isFinishEnabled = totalConfirmed > 0 && totalExpected > 0;

	return (
		<Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
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
							<TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
								Expected Qty
							</TableCell>
							<TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
								Units/Pallet
							</TableCell>
							<TableCell align="right">Actual Qty/Pallet</TableCell>
							<TableCell align="center">Confirmed</TableCell>
							<TableCell align="center">Actions</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((row, rowIndex) => (
							<React.Fragment key={row.line.id}>
								{/* Main row */}
								<TableRow
									sx={{
										backgroundColor: row.confirmedPallets.length > 0 ? "rgba(76, 175, 80, 0.1)" : "white",
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
									<TableCell
										align="right"
										sx={{ display: { xs: "none", sm: "table-cell" }, fontSize: { xs: "0.875rem", sm: "1rem" } }}
									>
										{row.line.expected_qty}
									</TableCell>
									<TableCell
										align="right"
										sx={{ display: { xs: "none", md: "table-cell" }, fontSize: { xs: "0.875rem", sm: "1rem" } }}
									>
										{row.product.units_per_pallet}
									</TableCell>
									<TableCell align="right" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
										{row.confirmedPallets.length === 0 ? (
											<TextField
												type="number"
												size="small"
												value={editingQty[row.line.id] || ""}
												onChange={(e) => handleQtyChange(row.line.id, Number.parseInt(e.target.value) || 0)}
												inputProps={{ min: 1 }}
												sx={{ width: "80px" }}
											/>
										) : (
											<Typography variant="body2" sx={{ fontWeight: "bold" }}>
												{row.confirmedPallets[0].qty}
											</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										<Chip
											label={`${row.confirmedPallets.length}/${row.expectedPallets}`}
											color={row.confirmedPallets.length > 0 ? "success" : "default"}
											size="small"
										/>
									</TableCell>
									<TableCell align="center">
										<Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 }, justifyContent: "center", flexWrap: "wrap" }}>
											{row.confirmedPallets.length < row.expectedPallets ? (
												<>
													<Button
														size={isTablet ? "small" : "small"}
														variant="contained"
														startIcon={<CheckCircleIcon size={16} />}
														onClick={() => handleConfirmPallet(rowIndex)}
														disabled={isSubmitting}
														sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
														title={`Confirm pallet ${row.confirmedPallets.length + 1}/${row.expectedPallets}`}
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
															disabled={isSubmitting}
															title={`Ship-Now to ${row.remainingQtyByOrder?.length || 0} order(s)`}
														>
															Ship-Now
														</Button>
													)}
												</>
											) : (
												<Button
													size="small"
													variant="outlined"
													color="error"
													startIcon={<TrashIcon size={16} />}
													onClick={() => handleUndoPallet(rowIndex, row.confirmedPallets.length - 1)}
													disabled={isSubmitting}
												>
													Undo Last
												</Button>
											)}
										</Box>
									</TableCell>
								</TableRow>
							</React.Fragment>
						))}
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
		</Container>
	);
}
