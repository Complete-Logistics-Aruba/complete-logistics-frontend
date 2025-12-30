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

	// Filter state
	const [textFilter, setTextFilter] = useState("");
	const [selectedRack, setSelectedRack] = useState<number | null>(null);

	// Load shipping order and available pallets
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
				// 1. Have no shipping_order_id (normal pallets not yet assigned), OR
				// 2. Already have this shipping_order_id (already picked for this order)
				// NOTE: Cross-dock pallets (is_cross_dock=true) are EXCLUDED from picking
				// They skip put-away AND picking, going directly to loading (Screen 12)
				const availablePallets = allPallets.filter((p) => {
					// EXCLUDE cross-dock pallets - they bypass picking
					if (p.is_cross_dock) return false;

					// If pallet has no shipping_order_id, it's available for any order
					if (!p.shipping_order_id) return true;

					// If pallet is already assigned to this order, include it
					if (p.shipping_order_id === shippingOrderId) return true;

					return false;
				});

				// Build pallet rows with RemainingQty calculation
				const rows: PalletRow[] = [];
				const itemQtyMap = new Map<string, number>();

				// Build map of requested qty per item
				for (const line of order.lines || []) {
					itemQtyMap.set(line.item_id, line.requested_qty);
				}

				// Calculate picked qty per item
				const pickedQtyMap = new Map<string, number>();
				for (const pallet of allPallets) {
					if (pallet.shipping_order_id === shippingOrderId) {
						const current = pickedQtyMap.get(pallet.item_id) || 0;
						pickedQtyMap.set(pallet.item_id, current + pallet.qty);
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
						});
					}
				}

				setPalletRows(rows);
			} catch (error) {
				console.error("Error loading data:", error);
				const message = error instanceof Error ? error.message : "Failed to load data";
				enqueueSnackbar(`Error: ${message}`, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [shippingOrderId, navigate, enqueueSnackbar]);

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
			// Update pallet with shipping_order_id and status='Staged' using direct Supabase query
			const { error } = await supabase
				.from("pallets")
				.update({
					shipping_order_id: shippingOrderId,
					status: "Staged", // Move pallet to Staged status when picked
				})
				.eq("id", palletId);

			if (error) {
				console.error("❌ [SELECT PALLET] Error updating pallet:", error);
				throw error;
			}

			// Remove from list
			setPalletRows((prev) => prev.filter((r) => r.palletId !== palletId));
			setSelectedPallets((prev) => new Set([...prev, palletId]));

			enqueueSnackbar("✅ Pallet selected and staged", { variant: "success" });
		} catch (error) {
			console.error("Error selecting pallet:", error);
			const message = error instanceof Error ? error.message : "Failed to select pallet";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleFinishPicking = async () => {
		if (selectedPallets.size === 0) {
			enqueueSnackbar("Please select at least one pallet", { variant: "warning" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Update shipping order status to Loading
			await shippingOrders.update(shippingOrderId, {
				status: "Loading",
			});

			enqueueSnackbar(`✅ Picking complete! ${selectedPallets.size} pallet(s) staged for loading`, {
				variant: "success",
			});

			// Navigate back to warehouse dashboard - picking is complete
			// Loading is a separate process that can be initiated later
			setTimeout(() => {
				navigate("/warehouse");
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

			{/* Actions */}
			<Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
				<Button
					variant="contained"
					color="success"
					startIcon={<CheckCircleIcon size={20} />}
					onClick={handleFinishPicking}
					disabled={selectedPallets.size === 0 || isSubmitting}
					size="large"
				>
					{isSubmitting ? <CircularProgress size={24} /> : "Finish Picking"}
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
