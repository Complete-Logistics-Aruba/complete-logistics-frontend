/* eslint-disable unicorn/filename-case */
/**
 * Screen 12: Pallet Loading
 *
 * WH user confirms pallets are physically loaded.
 * Supports partial loading (not all pallets need to be loaded).
 * Updates pallet status and manifest status on completion.
 *
 * Story 7.2 Acceptance Criteria:
 * 1. Display pallets: shipping_order_id=this_order, status=Staged or Received
 * 2. List: Item ID, Description, Location, Qty, Loaded (checkbox)
 * 3. Checkbox checked: pallet.status=Loaded; if container: pallet.manifest_id=selected_manifest_id
 * 4. Checkbox unchecked: pallet.status=Staged; remove manifest_id
 * 5. [Finish Loading] button: enabled even if NOT all pallets loaded
 * 6. On finish: shipping_order.status=Completed; if container: manifest.status=Closed
 */

import React, { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Chip,
	CircularProgress,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";

import { pallets, products, shippingOrders } from "../../lib/api/wms-api";
import { supabase } from "../../lib/auth/supabase-client";
import type { Product, ShippingOrder } from "../../types/domain";

interface PalletRow {
	palletId: string;
	itemId: string;
	description: string;
	qty: number;
	palletPositions: number;
	isLoaded: boolean;
	product: Product;
}

export default function Screen12() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();

	const { shippingOrderId, manifestId } = location.state || {};

	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [shippingOrder, setShippingOrder] = useState<ShippingOrder | null>(null);
	const [palletRows, setPalletRows] = useState<PalletRow[]>([]);
	const [loadedPalletIds, setLoadedPalletIds] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);

	// Load shipping order and pallets
	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
				setError(null);

				if (!shippingOrderId) {
					enqueueSnackbar("No shipping order selected", { variant: "error" });
					navigate("/warehouse");
					return;
				}

				// Fetch shipping order
				const order = await shippingOrders.getById(shippingOrderId);

				// Allow Loading or Pending status (for hybrid flow support)
				if (order.status !== "Loading" && order.status !== "Pending") {
					enqueueSnackbar("Shipping order must be in Loading or Pending status", { variant: "error" });
					navigate("/warehouse");
					return;
				}

				setShippingOrder(order);

				// Fetch pallets for this shipping order with Stored, Received, or Staged status
				const { data: storedPalletsData, error: storedError } = await supabase
					.from("pallets")
					.select("*")
					.eq("shipping_order_id", shippingOrderId)
					.eq("status", "Stored");
				const storedPallets = storedPalletsData || [];
				if (storedError) console.error("❌ [SCREEN 12] Error fetching stored pallets:", storedError);

				const { data: receivedPalletsData, error: receivedError } = await supabase
					.from("pallets")
					.select("*")
					.eq("shipping_order_id", shippingOrderId)
					.eq("status", "Received");
				const receivedPallets = receivedPalletsData || [];
				if (receivedError) console.error("❌ [SCREEN 12] Error fetching received pallets:", receivedError);

				const { data: stagedPalletsData, error: stagedError } = await supabase
					.from("pallets")
					.select("*")
					.eq("shipping_order_id", shippingOrderId)
					.eq("status", "Staged");
				const stagedPallets = stagedPalletsData || [];
				if (stagedError) console.error("❌ [SCREEN 12] Error fetching staged pallets:", stagedError);

				const allPallets = [...storedPallets, ...receivedPallets, ...stagedPallets];

				// Build pallet rows
				// Get unique item IDs for batch fetching
				const uniqueItemIds = [...new Set(allPallets.map((p) => p.item_id))];

				// Batch fetch all products
				const allProducts = await Promise.all(
					uniqueItemIds.map(async (itemId) => {
						try {
							return await products.getByItemId(itemId);
						} catch {
							return null;
						}
					})
				);

				// Create product lookup map
				const productMap = new Map();
				for (const product of allProducts) {
					if (product) {
						productMap.set(product.item_id, product);
					}
				}

				const rows: PalletRow[] = [];
				const loaded = new Set<string>();

				for (const pallet of allPallets) {
					try {
						// Fetch product
						const product = productMap.get(pallet.item_id);

						// Check if pallet is already loaded
						if (pallet.status === "Loaded") {
							loaded.add(pallet.id);
						}

						rows.push({
							palletId: pallet.id,
							itemId: product?.item_id,
							description: product?.description,
							qty: pallet.qty,
							palletPositions: product.pallet_positions,
							isLoaded: pallet.status === "Loaded",
							product,
						});
					} catch (error_) {
						console.error(`Failed to load pallet ${pallet.id}:`, error_);
					}
				}

				setPalletRows(rows);
				setLoadedPalletIds(loaded);
			} catch (error_) {
				const message = error_ instanceof Error ? error_.message : "Failed to load data";
				setError(message);
				enqueueSnackbar(message, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [shippingOrderId, manifestId, navigate, enqueueSnackbar]);

	// Handle pallet loaded checkbox
	const handleTogglePalletLoaded = async (palletId: string, isCurrentlyLoaded: boolean) => {
		try {
			const newStatus = isCurrentlyLoaded ? "Staged" : "Loaded";

			// CRITICAL VALIDATION: Prevent over-loading (loading more than ordered)
			// Only validate when checking (loading), not when unchecking
			if (!isCurrentlyLoaded) {
				const palletToLoad = palletRows.find((r) => r.palletId === palletId);
				if (!palletToLoad) {
					throw new Error("Pallet not found");
				}

				// Calculate total already loaded for this item
				const alreadyLoadedForItem = palletRows
					.filter((r) => r.itemId === palletToLoad.itemId && loadedPalletIds.has(r.palletId))
					.reduce((sum, r) => sum + r.qty, 0);

				// Get requested qty for this item from shipping order lines
				const orderLine = shippingOrder?.lines?.find((l) => l.item_id === palletToLoad.itemId);
				if (!orderLine) {
					throw new Error("Order line not found for this item");
				}

				const requestedQty = orderLine.requested_qty;
				const newTotal = alreadyLoadedForItem + palletToLoad.qty;

				if (newTotal > requestedQty) {
					const remaining = requestedQty - alreadyLoadedForItem;
					enqueueSnackbar(
						`Cannot load: Total qty (${newTotal}) would exceed ordered qty (${requestedQty}). Only ${remaining} units remaining for ${palletToLoad.itemId}.`,
						{ variant: "error" }
					);
					return;
				}
			}

			// Update pallet status
			const updates: Record<string, unknown> = { status: newStatus };

			// If container loading and marking as loaded, set manifest_id
			if (!isCurrentlyLoaded && manifestId && shippingOrder?.shipment_type === "Container_Loading") {
				updates.manifest_id = manifestId;
			}
			// Also assign manifest_id for other shipment types if manifestId exists
			else if (!isCurrentlyLoaded && manifestId) {
				updates.manifest_id = manifestId;
			}

			// If unchecking, remove manifest_id and clear location
			if (isCurrentlyLoaded) {
				updates.manifest_id = null;
				updates.location_id = null; // Clear location when moving back to Staged
			}

			await pallets.update(palletId, updates);

			// Update local state
			if (newStatus === "Loaded") {
				setLoadedPalletIds((prev) => new Set([...prev, palletId]));
			} else {
				setLoadedPalletIds((prev) => {
					const next = new Set(prev);
					next.delete(palletId);
					return next;
				});
			}

			enqueueSnackbar(`Pallet marked as ${newStatus === "Loaded" ? "loaded" : "not loaded"}`, { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to update pallet";
			enqueueSnackbar(message, { variant: "error" });
		}
	};

	// Handle Finish Loading
	const handleFinishLoading = async () => {
		if (!shippingOrder) return;

		try {
			setIsSubmitting(true);

			// Validate: at least one pallet must be loaded
			if (loadedPalletIds.size === 0) {
				console.warn("⚠️ [FINISH LOADING] No pallets loaded!");
				enqueueSnackbar("Please load at least one pallet before finishing", { variant: "warning" });
				setIsSubmitting(false);
				return;
			}

			// Check if any pallets remain staged for this order (waiting for second truck)
			const { data: remainingStagedPallets, error: stagedCheckError } = await supabase
				.from("pallets")
				.select("id")
				.eq("shipping_order_id", shippingOrder.id)
				.eq("status", "Staged");

			if (stagedCheckError) {
				throw new Error(`Failed to check staged pallets: ${stagedCheckError.message}`);
			}

			const hasStagedPallets = remainingStagedPallets && remainingStagedPallets.length > 0;

			// Determine final order status
			// IF staged pallets exist: Keep status='Loading' (open for second truck)
			// ELSE: Set status='Completed' (all pallets loaded)
			const finalOrderStatus = hasStagedPallets ? "Loading" : "Completed";

			// Update shipping order status
			await shippingOrders.update(shippingOrder.id, {
				status: finalOrderStatus,
			});

			// NOTE: Do NOT close the manifest here!
			// Per spec, manifests remain "Open" until Customer Service finalizes them in Screen 13
			// with signed forms and photos. Screen 12 only marks pallets as loaded.

			// Show appropriate success message
			const successMessage = hasStagedPallets
				? "✅ Truck loaded! Order remains open for additional pallets."
				: "✅ Loading completed successfully!";

			enqueueSnackbar(successMessage, {
				variant: "success",
			});

			// Navigate to home after 1.5 seconds
			setTimeout(() => {
				navigate("/warehouse");
			}, 1500);
		} catch (error_) {
			console.error("❌ [FINISH LOADING] ERROR:", error_);
			const message = error_ instanceof Error ? error_.message : "Failed to finish loading";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle back button
	const handleBack = () => {
		navigate("/warehouse/select-load-target", {
			state: { shippingOrderId },
		});
	};

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error || !shippingOrder) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">{error || "Failed to load shipping order"}</Alert>
				<Button startIcon={<ArrowLeftIcon />} onClick={handleBack} sx={{ mt: 2 }}>
					Back
				</Button>
			</Box>
		);
	}

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<Typography variant="h5" sx={{ fontWeight: 600 }}>
					Load Pallets
				</Typography>
				<Button startIcon={<ArrowLeftIcon />} onClick={handleBack} disabled={isSubmitting} variant="outlined">
					Back
				</Button>
			</Box>

			{/* Order Info Card */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
						<Box>
							<Typography color="textSecondary" gutterBottom>
								Order Reference
							</Typography>
							<Typography variant="h6">{shippingOrder.order_ref}</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" gutterBottom>
								Shipment Type
							</Typography>
							<Chip
								label={shippingOrder.shipment_type === "Hand_Delivery" ? "Hand Delivery" : "Container Loading"}
								color={shippingOrder.shipment_type === "Hand_Delivery" ? "primary" : "secondary"}
								variant="outlined"
							/>
						</Box>
						<Box>
							<Typography color="textSecondary" gutterBottom>
								Pallets to Load
							</Typography>
							<Typography variant="h6">{palletRows.length}</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" gutterBottom>
								Pallets Loaded
							</Typography>
							<Typography variant="h6">
								{loadedPalletIds.size} / {palletRows.length}
							</Typography>
						</Box>
					</Box>
				</CardContent>
			</Card>

			{/* Pallets Table */}
			{palletRows.length === 0 ? (
				<Alert severity="info">No pallets to load for this shipping order</Alert>
			) : (
				<TableContainer component={Paper} sx={{ mb: 3 }}>
					<Table>
						<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
							<TableRow>
								<TableCell sx={{ fontWeight: 600 }}>Item ID</TableCell>
								<TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
								<TableCell align="right" sx={{ fontWeight: 600 }}>
									Qty
								</TableCell>
								<TableCell align="right" sx={{ fontWeight: 600 }}>
									Pallet Positions
								</TableCell>
								<TableCell align="center" sx={{ fontWeight: 600 }}>
									Loaded
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{palletRows.map((row) => (
								<TableRow key={row.palletId} hover>
									<TableCell>{row.itemId}</TableCell>
									<TableCell>{row.description}</TableCell>
									<TableCell align="right">{row.qty}</TableCell>
									<TableCell align="right">{row.palletPositions}</TableCell>
									<TableCell align="center">
										<Checkbox
											checked={loadedPalletIds.has(row.palletId)}
											onChange={() => handleTogglePalletLoaded(row.palletId, loadedPalletIds.has(row.palletId))}
											disabled={isSubmitting}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			{/* Finish Loading Button */}
			<Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
				<Button
					variant="contained"
					size="large"
					startIcon={<CheckCircleIcon />}
					onClick={handleFinishLoading}
					disabled={isSubmitting || palletRows.length === 0}
					fullWidth
				>
					{isSubmitting ? <CircularProgress size={24} /> : "Finish Loading"}
				</Button>
			</Box>

			{/* Info message about partial loading */}
			<Alert severity="info" sx={{ mt: 3 }}>
				You can complete loading even if not all pallets are marked as loaded. Partial shipments are allowed.
			</Alert>
		</Box>
	);
}
