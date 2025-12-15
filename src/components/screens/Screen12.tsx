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

import { manifests, pallets, products, shippingOrders } from "../../lib/api/wms-api";
import { supabase } from "../../lib/auth/supabase-client";
import type { Manifest, Product, ShippingOrder } from "../../types/domain";

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
	const [manifest, setManifest] = useState<Manifest | null>(null);
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

				// Only allow Loading status
				if (order.status !== "Loading") {
					enqueueSnackbar("Shipping order is not in Loading status", { variant: "error" });
					navigate("/warehouse");
					return;
				}

				setShippingOrder(order);

				// If container loading, fetch and set manifest
				if (manifestId && order.shipment_type === "Container_Loading") {
					const containerManifest = await manifests.getById(manifestId);
					setManifest(containerManifest);
				}

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

				// Build pallet rows with product and pallet positions info
				const rows: PalletRow[] = [];
				const loaded = new Set<string>();

				for (const pallet of allPallets) {
					try {
						// Fetch product
						const product = await products.getByItemId(pallet.item_id);

						// Check if pallet is already loaded
						if (pallet.status === "Loaded") {
							loaded.add(pallet.id);
						}

						rows.push({
							palletId: pallet.id,
							itemId: product.item_id,
							description: product.description,
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

			// Update pallet status
			const updates: Record<string, unknown> = { status: newStatus };

			// If container loading and marking as loaded, set manifest_id
			if (!isCurrentlyLoaded && manifestId && shippingOrder?.shipment_type === "Container_Loading") {
				updates.manifest_id = manifestId;
			}

			// If unchecking, remove manifest_id
			if (isCurrentlyLoaded) {
				updates.manifest_id = null;
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

			// Update shipping order status to Completed
			await shippingOrders.update(shippingOrder.id, {
				status: "Completed",
			});

			// If container loading, update manifest status to Closed
			if (manifestId && manifest) {
				await manifests.update(manifestId, {
					status: "Closed",
				});
			}
			// Show success message and navigate to home
			enqueueSnackbar("✅ Loading completed successfully!", {
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
