/* eslint-disable unicorn/filename-case */
/**
 * Screen 10: Picking Workflow
 *
 * WH user picks pallets for a shipping order.
 * Validates quantity constraints and updates pallet assignments.
 *
 * Story 6.2 Acceptance Criteria:
 * 1. Display shipping order (status=Pending or Picking)
 * 2. List pallets: status IN (Stored, Received), shipping_order_id=NULL, item has RemainingQty > 0
 * 3. Columns: Item ID, Description, Location, Qty, [Select] button
 * 4. Verify picked_qty + pallet.qty ≤ requested_qty
 * 5. Update pallet.shipping_order_id on select
 * 6. Remove pallet from list, hide item if Remaining=0
 * 7. [Finish Picking] button sets status=Loading, navigates to Screen 11
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	ButtonGroup,
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
} from "@mui/material";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";

import { products, shippingOrders } from "../../lib/api/wms-api";
import { supabase } from "../../lib/auth/supabase-client";
import type { ShippingOrder } from "../../types/domain";

interface PalletRow {
	palletId: string;
	itemId: string;
	description: string;
	location: string;
	qty: number;
	rackNumber?: number;
	shippingOrderId?: string;
}

export default function Screen10() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();

	const { shippingOrderId } = location.state || {};

	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [shippingOrder, setShippingOrder] = useState<ShippingOrder | null>(null);
	const [palletRows, setPalletRows] = useState<PalletRow[]>([]);
	const [selectedPallets, setSelectedPallets] = useState<Set<string>>(new Set());
	const [selectedPalletDetails, setSelectedPalletDetails] = useState<PalletRow[]>([]);

	// Filter state
	const [textFilter, setTextFilter] = useState("");
	const [selectedRack, setSelectedRack] = useState<number | null>(null);

	// Summary state for Requested vs Remaining (Safety Net)
	const [totalRequested, setTotalRequested] = useState(0);
	const [totalRemaining, setTotalRemaining] = useState(0);
	const [crossDockQty, setCrossDockQty] = useState(0);
	const [pickedQty, setPickedQty] = useState(0);

	// Load shipping order and available pallets
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);

				if (!shippingOrderId) {
					enqueueSnackbar("No shipping order selected", { variant: "error" });
					navigate("/warehouse");
					return;
				}

				// Fetch shipping order
				const order = await shippingOrders.getById(shippingOrderId);

				// Only allow Pending or Picking status
				if (!["Pending", "Picking"].includes(order.status)) {
					enqueueSnackbar("Shipping order is not in Pending or Picking status", { variant: "error" });
					navigate("/warehouse");
					return;
				}

				setShippingOrder(order);

				// Fetch pallets with Stored status (normal put-away pallets)

				const { data: storedPalletsData, error: storedError } = await supabase
					.from("pallets")
					.select("*")
					.eq("status", "Stored");
				const storedPallets = storedPalletsData || [];
				if (storedError) console.error(" [SCREEN 10] Error fetching stored pallets:", storedError);

				// Fetch pallets with Staged status (SHIP-NOW cross-dock pallets ready for picking)

				const { data: stagedPalletsData, error: stagedError } = await supabase
					.from("pallets")
					.select("*")
					.eq("status", "Staged");
				const stagedPallets = stagedPalletsData || [];
				if (stagedError) console.error(" [SCREEN 10] Error fetching staged pallets:", stagedError);

				// Combine all available pallets (Stored + Staged)
				const allPallets = [...storedPallets, ...stagedPallets];

				// Filter for pallets that are available for this order:
				// 1. Have no shipping_order_id (normal pallets not yet assigned)
				// 2. EXCLUDE pallets already assigned to this order (already picked)
				// 3. EXCLUDE pallets assigned to other orders
				// NOTE: Cross-dock pallets (is_cross_dock=true) are EXCLUDED from picking
				// They skip put-away AND picking, going directly to loading (Screen 12)
				const availablePallets = allPallets.filter((p) => {
					// EXCLUDE cross-dock pallets - they bypass picking
					if (p.is_cross_dock) return false;

					// EXCLUDE pallets already assigned to THIS order - they're already picked
					if (p.shipping_order_id === shippingOrderId) {
						return false;
					}

					// If pallet has no shipping_order_id, it's available for any order
					if (!p.shipping_order_id) return true;

					// Pallet is assigned to a different order - exclude it
					return false;
				});

				// Build pallet rows with RemainingQty calculation
				const rows: PalletRow[] = [];
				const itemQtyMap = new Map<string, number>();

				// Build map of requested qty per item
				for (const line of order.lines || []) {
					itemQtyMap.set(line.item_id, line.requested_qty);
				}

				// Calculate picked qty per item and cross-dock qty
				const pickedQtyMap = new Map<string, number>();
				let totalCrossDock = 0;
				let totalPicked = 0;

				for (const pallet of allPallets) {
					if (pallet.shipping_order_id === shippingOrderId) {
						const current = pickedQtyMap.get(pallet.item_id) || 0;
						pickedQtyMap.set(pallet.item_id, current + pallet.qty);

						// Track cross-dock vs picked separately
						if (pallet.is_cross_dock) {
							totalCrossDock += pallet.qty;
						} else {
							totalPicked += pallet.qty;
						}
					}
				}

				// Build rows for available pallets
				for (const pallet of availablePallets) {
					const requested = itemQtyMap.get(pallet.item_id) || 0;
					const picked = pickedQtyMap.get(pallet.item_id) || 0;
					const remaining = requested - picked;

					// Show if:
					// 1. RemainingQty > 0 (normal pallets not yet picked), OR
					// 2. Pallet is already assigned to this order (cross-dock pallets)
					if (remaining > 0 || pallet.shipping_order_id === shippingOrderId) {
						// Fetch product for description
						let product;
						try {
							const allProducts = await products.getAll();
							product = allProducts.find((p) => p.item_id === pallet.item_id);
							if (!product) {
								throw new Error(`Product not found for item_id: ${pallet.item_id}`);
							}
						} catch (error) {
							console.error("Error fetching product:", error);
							// Use item_id as fallback description
							product = {
								id: "",
								item_id: pallet.item_id,
								description: pallet.item_id,
								units_per_pallet: 0,
								created_at: "",
							};
						}

						// Fetch location for display and extract rack number
						let locationStr = "N/A";
						let rackNumber: number | undefined;
						if (pallet.location_id) {
							try {
								// Fetch location directly from database using location_id
								const { data: locationData, error: locError } = await supabase
									.from("locations")
									.select("*")
									.eq("location_id", pallet.location_id)
									.single();

								if (locError) {
									console.error("Error fetching location:", locError);
								} else if (locationData) {
									locationStr = locationData.location_id || "N/A";
									// Extract rack number from location_id
									// Rack format: "W1-5-3-D" -> rack 5
									// Aisle format: "W1-AISLE-01" -> no rack number (undefined)
									const rackMatch = locationStr.match(/W1-(\d+)-/);
									if (rackMatch) {
										rackNumber = Number.parseInt(rackMatch[1], 10);
									}
									// Note: Aisle locations (W1-AISLE-01, etc.) will have rackNumber = undefined
									// This allows them to be shown regardless of rack filter selection
								} else {
									console.warn(`No location data returned for id: ${pallet.location_id}`);
								}
							} catch (error) {
								console.error(`Error fetching location for pallet ${pallet.id}:`, error);
								// Location fetch failed, use N/A
							}
						} else {
							// SHIP-NOW pallets have no location_id (they skip put-away)
							if (pallet.shipping_order_id) {
								locationStr = "📦 Cross-Dock";
							}
						}

						rows.push({
							palletId: pallet.id,
							itemId: pallet.item_id,
							description: product.description,
							location: locationStr,
							qty: pallet.qty,
							rackNumber,
							shippingOrderId: pallet.shipping_order_id,
						});
					}
				}

				setPalletRows(rows);

				// Calculate summary: Total Requested vs Total Remaining (Safety Net)
				let requested = 0;
				let remaining = 0;
				for (const line of order.lines || []) {
					const picked = pickedQtyMap.get(line.item_id) || 0;
					const itemRemaining = line.requested_qty - picked;
					requested += line.requested_qty;
					remaining += Math.max(0, itemRemaining); // Don't count negative
				}
				setTotalRequested(requested);
				setTotalRemaining(remaining);
				setCrossDockQty(totalCrossDock);
				setPickedQty(totalPicked);
			} catch (error) {
				console.error("Error loading data:", error);
				const message = error instanceof Error ? error.message : "Failed to load data";
				enqueueSnackbar(`Error: ${message}`, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [shippingOrderId, navigate, enqueueSnackbar, refreshKey]);

	// Auto-refresh when page becomes visible (e.g., navigating back from Screen 8)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && shippingOrderId) {
				setRefreshKey((prev) => prev + 1);
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [shippingOrderId]);

	// Compute filtered pallets based on text and rack filters
	const filteredPalletRows = useMemo(() => {
		return palletRows.filter((row) => {
			// Text filter: match Item ID or Description (case-insensitive)
			if (textFilter.trim()) {
				const searchTerm = textFilter.toLowerCase();
				const matchesText =
					row.itemId.toLowerCase().includes(searchTerm) || row.description.toLowerCase().includes(searchTerm);
				if (!matchesText) return false;
			}

			// Rack filter: match selected rack or show all if null
			// Aisle pallets (rackNumber = undefined) are always shown regardless of rack filter
			if (selectedRack !== null && row.rackNumber !== undefined && row.rackNumber !== selectedRack) {
				return false;
			}

			return true;
		});
	}, [palletRows, textFilter, selectedRack]);

	const handleResetFilters = () => {
		setTextFilter("");
		setSelectedRack(null);
	};

	const handleSelectPallet = async (palletId: string) => {
		try {
			setIsSubmitting(true);

			// Get the pallet being selected to validate quantity
			const selectedPallet = palletRows.find((r) => r.palletId === palletId);
			if (!selectedPallet) {
				throw new Error("Pallet not found");
			}

			// CRITICAL VALIDATION: Prevent over-picking (picking more than ordered)
			// Calculate total already picked for this item
			const alreadyPickedForItem = selectedPalletDetails
				.filter((p) => p.itemId === selectedPallet.itemId)
				.reduce((sum, p) => sum + p.qty, 0);

			// Get requested qty for this item from shipping order lines
			const orderLine = shippingOrder?.lines?.find((l) => l.item_id === selectedPallet.itemId);
			if (!orderLine) {
				throw new Error("Order line not found for this item");
			}

			const requestedQty = orderLine.requested_qty;
			const newTotal = alreadyPickedForItem + selectedPallet.qty;

			if (newTotal > requestedQty) {
				const remaining = requestedQty - alreadyPickedForItem;
				enqueueSnackbar(
					`Cannot pick: Total qty (${newTotal}) would exceed ordered qty (${requestedQty}). Only ${remaining} units remaining for ${selectedPallet.itemId}.`,
					{ variant: "error" }
				);
				setIsSubmitting(false);
				return;
			}

			// If this is the first pallet being picked, update order status to 'Picking'
			if (selectedPallets.size === 0) {
				await shippingOrders.update(shippingOrderId, {
					status: "Picking",
				});
			}

			// Update pallet with shipping_order_id and status='Staged' using direct Supabase query
			const { error } = await supabase
				.from("pallets")
				.update({
					shipping_order_id: shippingOrderId,
					status: "Staged", // Move pallet to Staged status when picked
					location_id: null, // Clear location when moving to Staged
				})
				.eq("id", palletId);

			if (error) {
				console.error("❌ [SELECT PALLET] Error updating pallet:", error);
				throw error;
			}

			// Remove from list and add to selected details
			setPalletRows((prev) => prev.filter((r) => r.palletId !== palletId));
			setSelectedPallets((prev) => new Set([...prev, palletId]));
			if (selectedPallet) {
				setSelectedPalletDetails((prev) => [...prev, selectedPallet]);
			}

			// Update summary calculations locally (avoid full page reload)
			if (selectedPallet) {
				setPickedQty((prev) => prev + selectedPallet.qty);
				// Remaining qty decreases as we pick pallets
				setTotalRemaining((prev) => Math.max(0, prev - selectedPallet.qty));
			}

			enqueueSnackbar("✅ Pallet selected and staged", { variant: "success" });
		} catch (error) {
			console.error("Error selecting pallet:", error);
			const message = error instanceof Error ? error.message : "Failed to select pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeselectPallet = async (palletId: string) => {
		try {
			setIsSubmitting(true);

			// Update pallet to remove shipping_order_id and set status back to 'Stored'
			const { error } = await supabase
				.from("pallets")
				.update({
					shipping_order_id: null,
					status: "Stored", // Move pallet back to Stored status when deselected
				})
				.eq("id", palletId);

			if (error) {
				console.error("❌ [DESELECT PALLET] Error updating pallet:", error);
				throw error;
			}

			// Get the pallet being deselected to restore it to the list
			// We need to fetch the pallet details to restore it
			const { data: palletData, error: fetchError } = await supabase
				.from("pallets")
				.select(
					`
					id,
					item_id,
					qty,
					location_id,
					products (
						description
					)
				`
				)
				.eq("id", palletId)
				.single();

			if (fetchError) {
				console.error("Error fetching pallet data:", fetchError);
				throw fetchError;
			}

			// Remove from selected set and details
			setSelectedPallets((prev) => {
				const newSet = new Set(prev);
				newSet.delete(palletId);
				return newSet;
			});
			setSelectedPalletDetails((prev) => prev.filter((p) => p.palletId !== palletId));

			// Restore pallet to the list
			if (palletData) {
				let locationStr = "N/A";
				let rackNumber: number | undefined;

				if (palletData.location_id) {
					try {
						const { data: locationData, error: locError } = await supabase
							.from("locations")
							.select("*")
							.eq("location_id", palletData.location_id)
							.single();

						if (!locError && locationData) {
							locationStr = locationData.location_id || "N/A";
							const rackMatch = locationStr.match(/W1-(\d+)-/);
							if (rackMatch) {
								rackNumber = Number.parseInt(rackMatch[1], 10);
							}
						}
					} catch (error) {
						console.error(`Error fetching location for pallet ${palletData.id}:`, error);
					}
				}

				const restoredPallet: PalletRow = {
					palletId: palletData.id,
					itemId: palletData.item_id,
					description:
						(Array.isArray(palletData.products) && palletData.products[0]?.description) || palletData.item_id,
					location: locationStr || "N/A",
					qty: palletData.qty,
					rackNumber,
					shippingOrderId: undefined,
				};

				setPalletRows((prev) => [...prev, restoredPallet]);

				// Update summary calculations
				setPickedQty((prev) => Math.max(0, prev - palletData.qty));
				setTotalRemaining((prev) => prev + palletData.qty);
			}

			enqueueSnackbar("✅ Pallet deselected and returned to storage", { variant: "success" });
		} catch (error) {
			console.error("Error deselecting pallet:", error);
			const message = error instanceof Error ? error.message : "Failed to deselect pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleFinishPicking = async () => {
		// Safety Net Logic: Allow finishing if:
		// 1. At least one pallet was picked manually, OR
		// 2. RemainingQty <= 0 (100% fulfilled via cross-dock or hybrid)
		if (selectedPallets.size === 0 && totalRemaining > 0) {
			enqueueSnackbar("Please select at least one pallet or wait for cross-dock fulfillment", { variant: "warning" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Update shipping order status to Loading
			await shippingOrders.update(shippingOrderId, {
				status: "Loading",
			});

			const message =
				selectedPallets.size > 0
					? `✅ Picking complete! ${selectedPallets.size} pallet(s) staged for loading`
					: "✅ Order 100% fulfilled via cross-dock! Ready for loading";

			enqueueSnackbar(message, {
				variant: "success",
			});

			// Navigate to pending shipping orders screen
			setTimeout(() => {
				navigate("/warehouse/pending-shipping-orders");
			}, 1500);
		} catch (error) {
			console.error("Error finishing picking:", error);
			const message = error instanceof Error ? error.message : "Failed to finish picking";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
				<CircularProgress />
			</Box>
		);
	}

	if (!shippingOrder) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">Shipping order not found</Alert>
			</Box>
		);
	}

	return (
		<Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
				<Button startIcon={<ArrowLeftIcon size={20} />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
					Back
				</Button>
				<Typography variant="h4" sx={{ flex: 1, fontWeight: "bold" }}>
					🎯 Pick Pallets
				</Typography>
				<Button
					startIcon={<ArrowClockwiseIcon size={20} />}
					onClick={() => setRefreshKey((prev) => prev + 1)}
					disabled={isLoading}
					sx={{ ml: 2 }}
				>
					Refresh
				</Button>
			</Box>

			{/* Order Info */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
						<Box>
							<Typography color="textSecondary" variant="body2">
								Order ID
							</Typography>
							<Typography variant="h6">{shippingOrder.order_ref}</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" variant="body2">
								Shipment Type
							</Typography>
							<Typography variant="h6">{shippingOrder.shipment_type}</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" variant="body2">
								Status
							</Typography>
							<Chip label={shippingOrder.status} color="primary" variant="outlined" />
						</Box>
						<Box>
							<Typography color="textSecondary" variant="body2">
								Pallets Selected
							</Typography>
							<Typography variant="h6">{selectedPallets.size}</Typography>
						</Box>
					</Box>
				</CardContent>
			</Card>

			{/* Header Summary: Requested vs Remaining (Safety Net) */}
			<Card sx={{ mb: 3, backgroundColor: totalRemaining === 0 ? "#e8f5e9" : "#fff3e0" }}>
				<CardContent>
					<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
						📊 Order Summary (Safety Net)
					</Typography>
					<Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
						<Box>
							<Typography color="textSecondary" variant="body2">
								Total Requested
							</Typography>
							<Typography variant="h5" sx={{ fontWeight: "bold" }}>
								{totalRequested} units
							</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" variant="body2">
								Total Remaining
							</Typography>
							<Typography
								variant="h5"
								sx={{ fontWeight: "bold", color: totalRemaining === 0 ? "success.main" : "warning.main" }}
							>
								{totalRemaining} units
							</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" variant="body2">
								Allocated
							</Typography>
							<Typography variant="h5" sx={{ fontWeight: "bold", color: "success.main" }}>
								{totalRequested - totalRemaining} units ({crossDockQty} Cross-Dock + {pickedQty} Picked)
							</Typography>
						</Box>
					</Box>
					{totalRemaining === 0 && (
						<Alert severity="success" sx={{ mt: 2 }}>
							✅ Order 100% fulfilled! No picking required. Click &quot;Finish Picking&quot; to proceed to loading.
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Filters */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
						🔍 Filters
					</Typography>

					{/* Text Filter */}
					<Box sx={{ mb: 2 }}>
						<TextField
							fullWidth
							label="Search by Item ID or Description"
							placeholder="e.g., PROD-001 or Widget"
							value={textFilter}
							onChange={(e) => setTextFilter(e.target.value)}
							size="small"
							variant="outlined"
						/>
					</Box>

					{/* Rack Filter */}
					<Box sx={{ mb: 2 }}>
						<Typography variant="body2" sx={{ mb: 1, fontWeight: "bold" }}>
							Rack Filter:
						</Typography>
						<ButtonGroup size="small" variant="outlined">
							<Button onClick={() => setSelectedRack(null)} variant={selectedRack === null ? "contained" : "outlined"}>
								All
							</Button>
							{[1, 2, 3, 4, 5, 6, 7, 8].map((rack) => (
								<Button
									key={rack}
									onClick={() => setSelectedRack(rack)}
									variant={selectedRack === rack ? "contained" : "outlined"}
								>
									{rack}
								</Button>
							))}
						</ButtonGroup>
					</Box>

					{/* Filter Summary */}
					<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<Typography variant="body2" color="textSecondary">
							<strong>{filteredPalletRows.length}</strong> matching pallet(s)
							{textFilter && ` (search: "${textFilter}")`}
							{selectedRack !== null && ` (rack: ${selectedRack})`}
						</Typography>
						<Button
							size="small"
							variant="text"
							onClick={handleResetFilters}
							disabled={!textFilter && selectedRack === null}
						>
							Reset Filters
						</Button>
					</Box>
				</CardContent>
			</Card>

			{/* Empty State */}
			{filteredPalletRows.length === 0 ? (
				<Card>
					<CardContent sx={{ textAlign: "center", p: 4 }}>
						{palletRows.length === 0 ? (
							// No pallets at all
							<>
								<Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
									No pallets available
								</Typography>
								<Typography variant="body2" color="textSecondary">
									All items for this order have been picked or no pallets are available.
								</Typography>
							</>
						) : (
							// Pallets exist but filtered out
							<>
								<Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
									No matching pallets
								</Typography>
								<Typography variant="body2" color="textSecondary">
									Try adjusting your filters. {palletRows.length} pallet(s) available total.
								</Typography>
							</>
						)}
					</CardContent>
				</Card>
			) : (
				/* Pallets Table */
				<TableContainer component={Paper} sx={{ mb: 3 }}>
					<Table>
						<TableHead>
							<TableRow sx={{ backgroundColor: "#f5f5f5" }}>
								<TableCell>Item ID</TableCell>
								<TableCell>Description</TableCell>
								<TableCell>Location</TableCell>
								<TableCell align="right">Qty</TableCell>
								<TableCell align="center">Action</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{filteredPalletRows.map((row) => (
								<TableRow key={row.palletId} hover>
									<TableCell sx={{ fontWeight: "bold" }}>{row.itemId}</TableCell>
									<TableCell>{row.description}</TableCell>
									<TableCell>
										<Chip label={row.location} size="small" variant="outlined" />
									</TableCell>
									<TableCell align="right">{row.qty}</TableCell>
									<TableCell align="center">
										<Button
											size="small"
											variant="contained"
											color="primary"
											onClick={() => handleSelectPallet(row.palletId)}
											disabled={isSubmitting}
										>
											Select
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			{/* Selected Pallets Section */}
			{selectedPalletDetails.length > 0 && (
				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "success.main" }}>
							✅ Selected Pallets ({selectedPalletDetails.length})
						</Typography>
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead sx={{ backgroundColor: "#f8f9fa" }}>
									<TableRow>
										<TableCell>Item ID</TableCell>
										<TableCell>Description</TableCell>
										<TableCell>Qty</TableCell>
										<TableCell align="center">Action</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{selectedPalletDetails.map((row) => (
										<TableRow key={row.palletId} hover sx={{ backgroundColor: "#f0f8f0" }}>
											<TableCell sx={{ fontWeight: "bold" }}>{row.itemId}</TableCell>
											<TableCell>{row.description}</TableCell>
											<TableCell>{row.qty}</TableCell>
											<TableCell align="center">
												<Button
													size="small"
													variant="outlined"
													color="error"
													onClick={() => handleDeselectPallet(row.palletId)}
													disabled={isSubmitting}
												>
													Deselect
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* Actions */}
			<Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
				<Button
					variant="contained"
					color="success"
					startIcon={<CheckCircleIcon size={20} />}
					onClick={handleFinishPicking}
					disabled={(selectedPallets.size === 0 && totalRemaining > 0) || isSubmitting}
					size="large"
				>
					{isSubmitting ? <CircularProgress size={24} /> : totalRemaining === 0 ? "Finish Picking" : "Finish Picking"}
				</Button>
			</Box>

			{/* Summary */}
			{selectedPallets.size > 0 && (
				<Box sx={{ mt: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
					<Typography variant="body2" color="textSecondary">
						Pallets selected: <strong>{selectedPallets.size}</strong> | Remaining: <strong>{palletRows.length}</strong>
					</Typography>
				</Box>
			)}
		</Box>
	);
}
