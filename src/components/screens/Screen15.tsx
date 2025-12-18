/* eslint-disable unicorn/filename-case */
/**
 * Screen 15: Inventory Adjustments
 *
 * CSE writes off damaged or lost pallets.
 * Soft delete for audit trail with logging.
 *
 * Story 8.5 Acceptance Criteria:
 * 1. Search: Item ID or Pallet ID
 * 2. Display pallet details: Item ID, Qty, Location, Status
 * 3. [Write Off] button: select reason (Damaged, Lost, Count Correction)
 * 4. On save: pallet.status=WriteOff
 * 5. Log write-off action: pallet_id, reason, timestamp, user
 * 6. Prevent write-off of already-shipped pallets
 */

import React, { useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { useSnackbar } from "notistack";

import { locations, pallets, products } from "../../lib/api/wms-api";
import type { Location, Pallet, Product } from "../../types/domain";

type WriteOffReason = "Damaged" | "Lost" | "Count Correction";

interface PalletWithProduct extends Pallet {
	product?: Product;
	location?: Location;
}

export default function Screen15() {
	const { enqueueSnackbar } = useSnackbar();

	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<PalletWithProduct[]>([]);
	const [selectedPallet, setSelectedPallet] = useState<PalletWithProduct | null>(null);
	const [showWriteOffDialog, setShowWriteOffDialog] = useState(false);
	const [writeOffReason, setWriteOffReason] = useState<WriteOffReason>("Damaged");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Handle search
	const handleSearch = async () => {
		if (!searchQuery.trim()) {
			enqueueSnackbar("Please enter Item ID or Pallet ID", { variant: "warning" });
			return;
		}

		try {
			setIsSearching(true);
			setError(null);
			setSearchResults([]);
			setSelectedPallet(null);

			// Search by pallet ID or item ID
			let palletsList: Pallet[] = [];

			// Try to find all pallets and filter by ID or item_id
			const allPallets = await pallets.getFiltered({});

			// Filter by pallet ID or item ID
			palletsList = allPallets.filter((p) => p.id === searchQuery || p.item_id === searchQuery);

			// Fetch product and location details for each pallet
			const palletsWithProducts: PalletWithProduct[] = [];
			for (const pallet of palletsList) {
				try {
					const product = await products.getByItemId(pallet.item_id);
					let location;

					// Debug: Log pallet data
					console.log(`[Screen15] Processing pallet ${pallet.id}:`, {
						location_id: pallet.location_id,
						item_id: pallet.item_id,
						status: pallet.status,
					});

					// Fetch location if pallet has location_id
					if (pallet.location_id) {
						try {
							location = await locations.getById(pallet.location_id);
							console.log(`[Screen15] Found location for pallet ${pallet.id}:`, location);
						} catch (error) {
							console.log(`[Screen15] Location lookup failed for pallet ${pallet.id}:`, error);
							// Location not found, continue without it
						}
					} else {
						console.log(`[Screen15] Pallet ${pallet.id} has no location_id`);
					}

					palletsWithProducts.push({ ...pallet, product, location });
				} catch {
					palletsWithProducts.push(pallet);
				}
			}

			if (palletsWithProducts.length === 0) {
				enqueueSnackbar("No pallets found", { variant: "info" });
			} else {
				setSearchResults(palletsWithProducts);
			}
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Search failed";
			setError(message);
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsSearching(false);
		}
	};

	// Handle select pallet
	const handleSelectPallet = (pallet: PalletWithProduct) => {
		setSelectedPallet(pallet);
		setSearchResults([]);
	};

	// Handle write-off button click
	const handleWriteOffClick = () => {
		if (!selectedPallet) return;

		// Check if pallet is already shipped
		if (selectedPallet.status === "Shipped") {
			enqueueSnackbar("Cannot write off shipped pallets", { variant: "error" });
			return;
		}

		setShowWriteOffDialog(true);
	};

	// Handle write-off confirmation
	const handleWriteOffConfirm = async () => {
		if (!selectedPallet) return;

		try {
			setIsSubmitting(true);

			// Update pallet status to WriteOff
			await pallets.update(selectedPallet.id, {
				status: "WriteOff",
			});

			// Log write-off action
			logWriteOff(selectedPallet.id, writeOffReason);

			enqueueSnackbar(`Pallet written off as ${writeOffReason}`, { variant: "success" });

			// Reset state
			setShowWriteOffDialog(false);
			setSelectedPallet(null);
			setWriteOffReason("Damaged");
			setSearchQuery("");
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to write off pallet";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Log write-off action
	const logWriteOff = (palletId: string, reason: WriteOffReason) => {
		const timestamp = new Date().toISOString();
		const logEntry = {
			palletId,
			reason,
			timestamp,
			user: "current-user", // TODO: Get from auth context
			action: "WRITE_OFF",
		};

		console.log("[Inventory Adjustment]", logEntry);
		// TODO: Save to Supabase audit log table if needed
	};

	// Handle back/clear
	const handleClear = () => {
		setSelectedPallet(null);
		setSearchQuery("");
		setSearchResults([]);
		setError(null);
	};

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
				Inventory Adjustments
			</Typography>

			{/* Search Card */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
						Search Pallet
					</Typography>

					<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
						<TextField
							label="Item ID or Pallet ID"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && handleSearch()}
							fullWidth
							disabled={isSearching}
							placeholder="e.g., ITEM-001 or pallet-123"
						/>
						<Button
							variant="contained"
							startIcon={<MagnifyingGlassIcon />}
							onClick={handleSearch}
							disabled={isSearching}
							sx={{ minWidth: "120px" }}
						>
							{isSearching ? <CircularProgress size={24} /> : "Search"}
						</Button>
					</Box>

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Search Results */}
			{searchResults.length > 0 && (
				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
							Search Results ({searchResults.length})
						</Typography>

						<TableContainer component={Paper}>
							<Table>
								<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Pallet ID</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Item ID</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{searchResults.map((pallet) => (
										<TableRow key={pallet.id} hover>
											<TableCell>{pallet.id}</TableCell>
											<TableCell>{pallet.product?.item_id || pallet.item_id}</TableCell>
											<TableCell>
												{pallet.location
													? pallet.location.type === "RACK"
														? `R${pallet.location.rack}-L${pallet.location.level}-${pallet.location.position}`
														: `AISLE-${pallet.location.location_id}`
													: "Unassigned"}
											</TableCell>
											<TableCell>{pallet.qty}</TableCell>
											<TableCell>{pallet.status}</TableCell>
											<TableCell>
												<Button size="small" variant="outlined" onClick={() => handleSelectPallet(pallet)}>
													Select
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

			{/* Selected Pallet Details */}
			{selectedPallet && (
				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
							Pallet Details
						</Typography>

						<Box sx={{ mb: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
							<Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
								<Box>
									<Typography variant="body2" color="textSecondary">
										Pallet ID
									</Typography>
									<Typography variant="body1" sx={{ fontWeight: 600 }}>
										{selectedPallet.id}
									</Typography>
								</Box>
								<Box>
									<Typography variant="body2" color="textSecondary">
										Item ID
									</Typography>
									<Typography variant="body1" sx={{ fontWeight: 600 }}>
										{selectedPallet.product?.item_id || selectedPallet.item_id}
									</Typography>
								</Box>
								<Box>
									<Typography variant="body2" color="textSecondary">
										Location
									</Typography>
									<Typography variant="body1" sx={{ fontWeight: 600 }}>
										{selectedPallet.location
											? selectedPallet.location.type === "RACK"
												? `R${selectedPallet.location.rack}-L${selectedPallet.location.level}-${selectedPallet.location.position}`
												: `AISLE-${selectedPallet.location.location_id}`
											: "Unassigned"}
									</Typography>
								</Box>
								<Box>
									<Typography variant="body2" color="textSecondary">
										Quantity
									</Typography>
									<Typography variant="body1" sx={{ fontWeight: 600 }}>
										{selectedPallet.qty}
									</Typography>
								</Box>
								<Box>
									<Typography variant="body2" color="textSecondary">
										Status
									</Typography>
									<Typography variant="body1" sx={{ fontWeight: 600 }}>
										{selectedPallet.status}
									</Typography>
								</Box>
							</Box>
						</Box>

						{selectedPallet.status === "Shipped" && (
							<Alert severity="error" sx={{ mb: 2 }}>
								Cannot write off shipped pallets
							</Alert>
						)}

						<Box sx={{ display: "flex", gap: 2 }}>
							<Button
								variant="contained"
								color="error"
								startIcon={<TrashIcon />}
								onClick={handleWriteOffClick}
								disabled={selectedPallet.status === "Shipped"}
							>
								Write Off
							</Button>
							<Button variant="outlined" onClick={handleClear}>
								Clear
							</Button>
						</Box>
					</CardContent>
				</Card>
			)}

			{/* Write-Off Dialog */}
			<Dialog open={showWriteOffDialog} onClose={() => setShowWriteOffDialog(false)}>
				<DialogTitle>Write Off Pallet</DialogTitle>
				<DialogContent sx={{ minWidth: "400px", pt: 2 }}>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Pallet ID: <strong>{selectedPallet?.id}</strong>
					</Typography>

					<FormControl fullWidth>
						<InputLabel>Reason</InputLabel>
						<Select
							value={writeOffReason}
							onChange={(e) => setWriteOffReason(e.target.value as WriteOffReason)}
							label="Reason"
						>
							<MenuItem value="Damaged">Damaged</MenuItem>
							<MenuItem value="Lost">Lost</MenuItem>
							<MenuItem value="Count Correction">Count Correction</MenuItem>
						</Select>
					</FormControl>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowWriteOffDialog(false)}>Cancel</Button>
					<Button onClick={handleWriteOffConfirm} variant="contained" color="error" disabled={isSubmitting}>
						{isSubmitting ? <CircularProgress size={24} /> : "Confirm Write-Off"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
