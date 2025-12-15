/**
 * Screen 8: Put-Away Pallet Assignment & Internal Pallet Moves
 *
 * Story 5.1: WH user assigns storage locations to received pallets
 * Story 5.2: WH user moves already-stored pallets to different locations
 *
 * Story 5.1 Acceptance Criteria:
 * 1. Display pallets: status=Received, shipping_order_id=NULL (not cross-dock)
 * 2. List: Item ID, Description, Qty, Location selection
 * 3. Location options: Rack (1-8), Level (1-4), Position (A-T); Aisle (W1-AISLE)
 * 4. On save: pallet.location_id=resolved_location_id, pallet.status=Stored
 * 5. Remove pallet from list after save
 * 6. Warning if another pallet already in chosen location (WH can proceed)
 * 7. [Complete Put-Away] button when list empty
 *
 * Story 5.2 Acceptance Criteria:
 * 1. Screen 8 includes option to move stored pallets (status=Stored)
 * 2. Search/scan pallet by Item ID or Pallet ID
 * 3. Display current location
 * 4. Allow new location selection (same as put-away)
 * 5. On save: update pallet.location_id
 * 6. Log move action (from/to location, timestamp)
 */

import React, { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	ButtonGroup,
	Card,
	CardContent,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	Typography,
} from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

import { locations, pallets as palletsApi, products, warehouses } from "../../lib/api/wms-api";
import { supabase } from "../../lib/auth/supabase-client";
import { Location, Pallet, Product } from "../../types/domain";

interface PalletWithProduct extends Pallet {
	product?: Product;
}

interface LocationSelection {
	palletId: string;
	rackNum?: number;
	level?: number;
	position?: string;
	isAisle?: boolean;
	aisleZone?: number; // 1-4 for W1-AISLE-01 through W1-AISLE-04
}

export default function Screen8() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();

	const [pallets, setPallets] = useState<PalletWithProduct[]>([]);
	const [storedPallets, setStoredPallets] = useState<PalletWithProduct[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedPallet, setSelectedPallet] = useState<PalletWithProduct | null>(null);
	const [locationSelection, setLocationSelection] = useState<LocationSelection>({
		palletId: "",
	});
	const [showLocationDialog, setShowLocationDialog] = useState(false);
	const [locationConflict, setLocationConflict] = useState<string | null>(null);
	const [warehouseId, setWarehouseId] = useState<string>("");

	// Tab state (0 = Put-Away, 1 = Move Pallet)
	const [activeTab, setActiveTab] = useState(0);

	// Move pallet state
	const [moveFromLocation, setMoveFromLocation] = useState<Location | null>(null);

	// Load warehouse and received pallets
	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
				// Fetch default warehouse
				const warehouse = await warehouses.getDefault();
				setWarehouseId(warehouse.id);
				// Fetch pallets with status=Received and shipping_order_id=NULL
				const receivedPallets = await palletsApi.getFiltered({
					status: "Received",
					shipping_order_id: undefined,
				});
				// Enrich pallets with product info
				const enrichedPallets = await Promise.all(
					receivedPallets.map(async (pallet) => {
						try {
							const product = await products.getByItemId(pallet.item_id);
							return { ...pallet, product };
						} catch {
							return pallet;
						}
					})
				);

				setPallets(enrichedPallets);
				// Fetch stored pallets for Move Pallet tab
				const stored = await palletsApi.getFiltered({
					status: "Stored",
				});

				// Enrich stored pallets with product info
				const enrichedStoredPallets = await Promise.all(
					stored.map(async (pallet) => {
						try {
							const product = await products.getByItemId(pallet.item_id);
							return { ...pallet, product };
						} catch {
							return pallet;
						}
					})
				);

				setStoredPallets(enrichedStoredPallets);

				if (enrichedPallets.length === 0) {
					console.warn("⚠️ [SCREEN 8 LOAD] No pallets to put away!");
					enqueueSnackbar("No pallets to put away", { variant: "info" });
				}
			} catch (error) {
				console.error("❌ [SCREEN 8 LOAD] ERROR:", error);
				const message = error instanceof Error ? error.message : "Failed to load pallets";
				enqueueSnackbar(message, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [enqueueSnackbar]);

	// Refresh stored pallets when switching to Move Pallet tab
	useEffect(() => {
		if (activeTab === 1) {
			const refreshStoredPallets = async () => {
				try {
					const stored = await palletsApi.getFiltered({
						status: "Stored",
					});

					// Enrich stored pallets with product info
					const enrichedStoredPallets = await Promise.all(
						stored.map(async (pallet) => {
							try {
								const product = await products.getByItemId(pallet.item_id);
								return { ...pallet, product };
							} catch {
								return pallet;
							}
						})
					);

					setStoredPallets(enrichedStoredPallets);
				} catch (error) {
					console.error("❌ [SCREEN 8] Error refreshing stored pallets:", error);
					const message = error instanceof Error ? error.message : "Failed to refresh stored pallets";
					enqueueSnackbar(message, { variant: "error" });
				}
			};

			refreshStoredPallets();
		}
	}, [activeTab, enqueueSnackbar]);

	// Handle location selection dialog
	const handleSelectPallet = (pallet: PalletWithProduct) => {
		setSelectedPallet(pallet);
		setLocationSelection({ palletId: pallet.id });
		setLocationConflict(null);
		setShowLocationDialog(true);
	};

	// Handle rack button click
	const handleRackSelect = (rack: number) => {
		setLocationSelection((prev) => ({
			...prev,
			rackNum: prev.rackNum === rack ? undefined : rack,
			isAisle: false,
		}));
	};

	// Handle level button click
	const handleLevelSelect = (level: number) => {
		setLocationSelection((prev) => ({
			...prev,
			level: prev.level === level ? undefined : level,
		}));
	};

	// Handle position button click
	const handlePositionSelect = (position: string) => {
		setLocationSelection((prev) => ({
			...prev,
			position: prev.position === position ? undefined : position,
		}));
	};

	// Handle aisle selection
	const handleAisleSelect = () => {
		setLocationSelection((prev) => ({
			...prev,
			isAisle: !prev.isAisle,
			rackNum: undefined,
			level: undefined,
			position: undefined,
			aisleZone: undefined,
		}));
	};

	// Handle aisle zone selection (1-4)
	const handleAisleZoneSelect = (zone: number) => {
		setLocationSelection((prev) => ({
			...prev,
			aisleZone: prev.aisleZone === zone ? undefined : zone,
		}));
	};

	// Check for location conflicts
	const checkLocationConflict = async (locationId: string): Promise<boolean> => {
		try {
			const occupiedPallets = await palletsApi.getFiltered({
				location_id: locationId,
			});

			if (occupiedPallets.length > 0) {
				setLocationConflict(`Location already has ${occupiedPallets.length} pallet(s). You can proceed anyway.`);
				return true;
			}

			return false;
		} catch (error) {
			console.error("Error checking location conflict:", error);
			return false;
		}
	};

	// Handle save location
	const handleSaveLocation = async () => {
		if (!selectedPallet) {
			console.error("❌ [SAVE LOCATION] No pallet selected!");
			return;
		}

		try {
			setIsSubmitting(true);

			// Validate location selection
			if (locationSelection.isAisle) {
				// Aisle location - require zone selection
				if (!locationSelection.aisleZone) {
					console.warn("⚠️ [SAVE LOCATION] No aisle zone selected!");
					enqueueSnackbar("Please select an aisle zone (1-4)", { variant: "warning" });
					return;
				}
				// Resolve specific aisle zone (W1-AISLE-01 through W1-AISLE-04)
				const location = await locations.resolve(warehouseId, "AISLE", locationSelection.aisleZone, "A");

				// Check for conflicts
				await checkLocationConflict(location.location_id);
				// Update pallet
				const updateData: Partial<Pallet> = {
					location_id: location.location_id,
					status: "Stored" as const,
					received_at: new Date().toISOString(),
				};
				await palletsApi.update(selectedPallet.id, updateData);

				enqueueSnackbar("✅ Pallet assigned to aisle", { variant: "success" });
			} else if (locationSelection.rackNum && locationSelection.level && locationSelection.position) {
				// Rack location
				const location = await locations.resolve(
					warehouseId,
					locationSelection.rackNum,
					locationSelection.level,
					locationSelection.position
				);

				// Check for conflicts
				await checkLocationConflict(location.location_id);
				// Update pallet
				const rackUpdateData: Partial<Pallet> = {
					location_id: location.location_id,
					status: "Stored" as const,
					received_at: new Date().toISOString(),
				};
				await palletsApi.update(selectedPallet.id, rackUpdateData);
				enqueueSnackbar(
					`✅ Pallet assigned to Rack ${locationSelection.rackNum}-L${locationSelection.level}-${locationSelection.position}`,
					{ variant: "success" }
				);
			} else {
				console.warn("⚠️ [SAVE LOCATION] Incomplete location selection!");
				enqueueSnackbar("Please select a complete location (Rack, Level, Position or Aisle)", {
					variant: "warning",
				});
				return;
			}

			// Remove pallet from list
			setPallets((prev) => prev.filter((p) => p.id !== selectedPallet.id));
			setShowLocationDialog(false);
			setSelectedPallet(null);
		} catch (error) {
			console.error("❌ [SAVE LOCATION] ERROR:", error);
			console.error("  Error Type:", error instanceof Error ? error.constructor.name : typeof error);
			console.error("  Error Message:", error instanceof Error ? error.message : String(error));
			const message = error instanceof Error ? error.message : "Failed to save location";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle complete put-away
	const handleCompletePutAway = () => {
		enqueueSnackbar("✅ Put-Away completed successfully!", { variant: "success" });
	};

	// Handle select pallet for move
	const handleSelectPalletForMove = async (pallet: PalletWithProduct) => {
		try {
			// Fetch location details
			if (pallet.location_id) {
				const { data: location, error } = await supabase
					.from("locations")
					.select("*")
					.eq("id", pallet.location_id)
					.single();

				if (!error && location) {
					setMoveFromLocation(location as Location);
				}
			}

			setSelectedPallet(pallet);
			setLocationSelection({ palletId: pallet.id });
			setLocationConflict(null);
			setShowLocationDialog(true);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to load pallet location";
			enqueueSnackbar(message, { variant: "error" });
		}
	};

	// Handle save move
	const handleSaveMove = async () => {
		if (!selectedPallet) return;

		try {
			setIsSubmitting(true);

			// Validate location selection
			if (locationSelection.isAisle) {
				// Aisle location - require zone selection
				if (!locationSelection.aisleZone) {
					enqueueSnackbar("Please select an aisle zone (1-4)", { variant: "warning" });
					return;
				}

				const location = await locations.resolve(warehouseId, "AISLE", locationSelection.aisleZone, "A");

				// Check for conflicts
				await checkLocationConflict(location.location_id);

				// Update pallet
				await palletsApi.update(selectedPallet.id, {
					location_id: location.location_id,
				});

				// Log move
				logPalletMove(selectedPallet, moveFromLocation, location);

				enqueueSnackbar("✅ Pallet moved to aisle", { variant: "success" });
			} else if (locationSelection.rackNum && locationSelection.level && locationSelection.position) {
				const location = await locations.resolve(
					warehouseId,
					locationSelection.rackNum,
					locationSelection.level,
					locationSelection.position
				);

				// Check for conflicts
				await checkLocationConflict(location.location_id);

				// Update pallet
				await palletsApi.update(selectedPallet.id, {
					location_id: location.location_id,
				});

				// Log move
				logPalletMove(selectedPallet, moveFromLocation, location);

				enqueueSnackbar(
					`✅ Pallet moved to Rack ${locationSelection.rackNum}-L${locationSelection.level}-${locationSelection.position}`,
					{ variant: "success" }
				);
			} else {
				enqueueSnackbar("Please select a complete location (Rack, Level, Position or Aisle)", {
					variant: "warning",
				});
				return;
			}

			// Update the moved pallet in storedPallets with new location
			setStoredPallets((prevPallets) =>
				prevPallets.map((pallet) =>
					pallet.id === selectedPallet.id
						? {
								...pallet,
								location_id: locationSelection.isAisle
									? `W1-AISLE-0${locationSelection.aisleZone}`
									: `W1-${locationSelection.rackNum}-${locationSelection.level}-${locationSelection.position}`,
							}
						: pallet
				)
			);

			// Clear and close dialog
			setShowLocationDialog(false);
			setSelectedPallet(null);
			setMoveFromLocation(null);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to move pallet";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Log pallet move action
	const logPalletMove = (_pallet: PalletWithProduct, _fromLocation: Location | null, _toLocation: Location) => {
		// Create log entry for audit trail
		// This could be sent to a logging service or stored in database
		// For now, the function is simplified without using parameters
	};

	// Handle back
	const handleBack = () => {
		navigate("/warehouse");
	};

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
				<CircularProgress />
			</Box>
		);
	}

	const positions = [
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"G",
		"H",
		"I",
		"J",
		"K",
		"L",
		"M",
		"N",
		"O",
		"P",
		"Q",
		"R",
		"S",
		"T",
	];

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
				<Button startIcon={<ArrowLeftIcon size={20} />} onClick={handleBack} sx={{ mr: 2 }}>
					Back
				</Button>
				<Typography variant="h4" sx={{ flexGrow: 1 }}>
					Pallet Management
				</Typography>
			</Box>

			{/* Tabs */}
			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
				<Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
					<Tab label="Put-Away Assignment" />
					<Tab label="Move Pallet" />
				</Tabs>
			</Box>

			{/* PUT-AWAY TAB */}
			{activeTab === 0 && (
				<>
					{/* Empty State */}
					{pallets.length === 0 ? (
						<Card>
							<CardContent sx={{ textAlign: "center", py: 6 }}>
								<CheckCircleIcon size={48} weight="fill" style={{ color: "#4caf50", marginBottom: 16 }} />
								<Typography variant="h6" sx={{ mb: 1 }}>
									All pallets assigned!
								</Typography>
								<Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
									No more pallets to put away.
								</Typography>
								<Button variant="contained" color="success" onClick={handleCompletePutAway}>
									Complete Put-Away
								</Button>
							</CardContent>
						</Card>
					) : (
						<>
							{/* Pallet List */}
							<TableContainer component={Paper} sx={{ mb: 3 }}>
								<Table>
									<TableHead>
										<TableRow sx={{ backgroundColor: "#f5f5f5" }}>
											<TableCell>
												<strong>Item ID</strong>
											</TableCell>
											<TableCell>
												<strong>Description</strong>
											</TableCell>
											<TableCell align="right">
												<strong>Qty</strong>
											</TableCell>
											<TableCell align="center">
												<strong>Location Selection</strong>
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{pallets.map((pallet) => (
											<TableRow key={pallet.id}>
												<TableCell>{pallet.product?.item_id || "N/A"}</TableCell>
												<TableCell>{pallet.product?.description || "N/A"}</TableCell>
												<TableCell align="right">{pallet.qty}</TableCell>
												<TableCell align="center">
													<Button variant="contained" size="small" onClick={() => handleSelectPallet(pallet)}>
														Select Location
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>

							{/* Summary */}
							<Typography variant="body2" color="textSecondary">
								{pallets.length} pallet{pallets.length === 1 ? "" : "s"} remaining to assign
							</Typography>
						</>
					)}
				</>
			)}

			{/* MOVE PALLET TAB */}
			{activeTab === 1 && (
				<>
					{/* Stored Pallets List */}
					{storedPallets.length === 0 ? (
						<Card>
							<CardContent sx={{ textAlign: "center", py: 6 }}>
								<CheckCircleIcon size={48} weight="fill" style={{ color: "#4caf50", marginBottom: 16 }} />
								<Typography variant="h6" sx={{ mb: 1 }}>
									No pallets available to move
								</Typography>
								<Typography variant="body2" color="textSecondary">
									All pallets are currently in their assigned locations. Move pallets here to relocate them to different
									storage positions.
								</Typography>
							</CardContent>
						</Card>
					) : (
						<>
							{/* Stored Pallets Table */}
							<TableContainer component={Paper} sx={{ mb: 3 }}>
								<Table>
									<TableHead>
										<TableRow sx={{ backgroundColor: "#f5f5f5" }}>
											<TableCell>
												<strong>Item ID</strong>
											</TableCell>
											<TableCell>
												<strong>Description</strong>
											</TableCell>
											<TableCell align="right">
												<strong>Qty</strong>
											</TableCell>
											<TableCell>
												<strong>Current Location</strong>
											</TableCell>
											<TableCell align="center">
												<strong>Location Selection</strong>
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{storedPallets.map((pallet) => (
											<TableRow key={pallet.id}>
												<TableCell>{pallet.product?.item_id || "N/A"}</TableCell>
												<TableCell>{pallet.product?.description || "N/A"}</TableCell>
												<TableCell align="right">{pallet.qty}</TableCell>
												<TableCell>{pallet.location_id || "N/A"}</TableCell>
												<TableCell align="center">
													<Button
														variant="contained"
														size="small"
														onClick={() => handleSelectPalletForMove(pallet as PalletWithProduct)}
													>
														Move
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>

							{/* Summary */}
							<Typography variant="body2" color="textSecondary">
								{storedPallets.length} pallet{storedPallets.length === 1 ? "" : "s"} available to move
							</Typography>
						</>
					)}
				</>
			)}

			{/* Location Selection Dialog */}
			<Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>
					{activeTab === 0 ? "Assign Location to Pallet" : "Move Pallet to New Location"}
					{selectedPallet && (
						<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
							{selectedPallet.product?.item_id} - {selectedPallet.product?.description}
						</Typography>
					)}
					{activeTab === 1 && moveFromLocation && (
						<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
							Current Location: {moveFromLocation.location_id}
						</Typography>
					)}
				</DialogTitle>

				<DialogContent sx={{ pt: 3 }}>
					{/* Location Conflict Warning */}
					{locationConflict && (
						<Alert severity="warning" sx={{ mb: 3 }}>
							<WarningIcon size={20} style={{ marginRight: 8, verticalAlign: "middle" }} />
							{locationConflict}
						</Alert>
					)}

					{/* Show only Option A and B initially */}
					{locationSelection.isAisle === undefined && !locationSelection.rackNum ? (
						<Box sx={{ mb: 4 }}>
							<Typography variant="h6" sx={{ mb: 3, fontWeight: "bold", color: "#1976d2" }}>
								Choose Location Type
							</Typography>

							{/* Option A: Aisle Zone */}
							<Box
								sx={{
									p: 2.5,
									mb: 2,
									border: "2px solid #e0e0e0",
									borderRadius: 1,
									backgroundColor: "#fafafa",
									cursor: "pointer",
									transition: "all 0.3s ease",
									"&:hover": {
										borderColor: "#4caf50",
										backgroundColor: "rgba(76, 175, 80, 0.08)",
										boxShadow: "0 2px 8px rgba(76, 175, 80, 0.15)",
									},
								}}
								onClick={handleAisleSelect}
							>
								<Box sx={{ display: "flex", alignItems: "center" }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: "50%",
											border: "2px solid #4caf50",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											mr: 2,
											backgroundColor: "white",
										}}
									/>
									<Box>
										<Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#333" }}>
											Option A: Aisle Zone (Quick)
										</Typography>
										<Typography variant="body2" color="textSecondary">
											Send to overflow/aisle area (W1-AISLE-01 to 04)
										</Typography>
									</Box>
								</Box>
							</Box>

							{/* Option B: Rack Location */}
							<Box
								sx={{
									p: 2.5,
									border: "2px solid #e0e0e0",
									borderRadius: 1,
									backgroundColor: "#fafafa",
									cursor: "pointer",
									transition: "all 0.3s ease",
									"&:hover": {
										borderColor: "#1976d2",
										backgroundColor: "rgba(25, 118, 210, 0.08)",
										boxShadow: "0 2px 8px rgba(25, 118, 210, 0.15)",
									},
								}}
								onClick={() => {
									setLocationSelection({
										palletId: locationSelection.palletId,
										isAisle: false,
										rackNum: undefined,
										level: undefined,
										position: undefined,
										aisleZone: undefined,
									});
								}}
							>
								<Box sx={{ display: "flex", alignItems: "center" }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: "50%",
											border: "2px solid #1976d2",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											mr: 2,
											backgroundColor: "white",
										}}
									/>
									<Box>
										<Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#333" }}>
											Option B: Rack Location (Detailed)
										</Typography>
										<Typography variant="body2" color="textSecondary">
											Select specific Rack → Level → Position
										</Typography>
									</Box>
								</Box>
							</Box>
						</Box>
					) : null}

					{/* After selection, show the steps */}
					{locationSelection.isAisle === true || locationSelection.isAisle === false ? (
						<>
							{/* Step 2: Aisle Zone Selection */}
							{locationSelection.isAisle && (
								<Box sx={{ mb: 4, pb: 3, borderBottom: "2px solid #e0e0e0" }}>
									<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#4caf50" }}>
										Step 2: Select Aisle Zone
									</Typography>
									<ButtonGroup fullWidth size="small">
										{[1, 2, 3, 4].map((zone) => (
											<Button
												key={zone}
												variant={locationSelection.aisleZone === zone ? "contained" : "outlined"}
												onClick={() => handleAisleZoneSelect(zone)}
												sx={{
													fontWeight: locationSelection.aisleZone === zone ? "bold" : "normal",
												}}
											>
												Zone {zone}
											</Button>
										))}
									</ButtonGroup>
								</Box>
							)}

							{/* Step 2: Rack Selection */}
							{!locationSelection.isAisle && (
								<Box sx={{ mb: 4, pb: 3, borderBottom: "2px solid #e0e0e0" }}>
									<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#1976d2" }}>
										Step 2: Select Rack (1-8)
									</Typography>
									<ButtonGroup fullWidth size="small">
										{[1, 2, 3, 4, 5, 6, 7, 8].map((rack) => (
											<Button
												key={rack}
												variant={locationSelection.rackNum === rack ? "contained" : "outlined"}
												onClick={() => handleRackSelect(rack)}
												sx={{
													fontWeight: locationSelection.rackNum === rack ? "bold" : "normal",
												}}
											>
												{rack}
											</Button>
										))}
									</ButtonGroup>
								</Box>
							)}

							{/* Step 3: Level Selection */}
							{!locationSelection.isAisle && locationSelection.rackNum && (
								<Box sx={{ mb: 4, pb: 3, borderBottom: "2px solid #e0e0e0" }}>
									<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#1976d2" }}>
										Step 3: Select Level (1-4)
									</Typography>
									<ButtonGroup fullWidth size="small">
										{[1, 2, 3, 4].map((level) => (
											<Button
												key={level}
												variant={locationSelection.level === level ? "contained" : "outlined"}
												onClick={() => handleLevelSelect(level)}
												sx={{
													fontWeight: locationSelection.level === level ? "bold" : "normal",
												}}
											>
												{level}
											</Button>
										))}
									</ButtonGroup>
								</Box>
							)}

							{/* Step 4: Position Selection */}
							{!locationSelection.isAisle && locationSelection.level && (
								<Box sx={{ mb: 4, pb: 3, borderBottom: "2px solid #e0e0e0" }}>
									<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#1976d2" }}>
										Step 4: Select Position (A-T)
									</Typography>
									<Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1 }}>
										{positions.map((pos) => (
											<Button
												key={pos}
												variant={locationSelection.position === pos ? "contained" : "outlined"}
												size="small"
												onClick={() => handlePositionSelect(pos)}
												sx={{
													fontWeight: locationSelection.position === pos ? "bold" : "normal",
												}}
											>
												{pos}
											</Button>
										))}
									</Box>
								</Box>
							)}

							{/* Selected Location Display */}
							{(locationSelection.rackNum || locationSelection.isAisle) && (
								<Box
									sx={{
										p: 2.5,
										backgroundColor: "#e8f5e9",
										borderRadius: 1,
										border: "2px solid #4caf50",
										mb: 2,
									}}
								>
									<Typography variant="body2" sx={{ mb: 0.5 }}>
										<strong>✓ Selected Location:</strong>
									</Typography>
									<Typography variant="body1" sx={{ fontWeight: "bold", color: "#2e7d32", fontSize: "16px" }}>
										{locationSelection.isAisle
											? `Aisle Zone ${locationSelection.aisleZone} (W1-AISLE-${String(locationSelection.aisleZone).padStart(2, "0")})`
											: `Rack ${locationSelection.rackNum}-L${locationSelection.level}-${locationSelection.position || "?"}`}
									</Typography>
								</Box>
							)}

							{/* Back button to change option */}
							<Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #e0e0e0" }}>
								<Button
									variant="text"
									size="small"
									onClick={() => {
										setLocationSelection({
											palletId: locationSelection.palletId,
										});
									}}
									sx={{ color: "#666" }}
								>
									← Change Location Type
								</Button>
							</Box>
						</>
					) : null}
				</DialogContent>

				<DialogActions>
					<Button onClick={() => setShowLocationDialog(false)}>Cancel</Button>
					<Button
						variant="contained"
						onClick={activeTab === 0 ? handleSaveLocation : handleSaveMove}
						disabled={isSubmitting}
					>
						{isSubmitting ? <CircularProgress size={20} /> : activeTab === 0 ? "Save Location" : "Move Pallet"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
