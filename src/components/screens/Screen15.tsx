/* eslint-disable unicorn/filename-case */
/**
 * Screen 15: Inventory Grid
 *
 * Comprehensive inventory view with 16 columns including joins.
 * Displays all pallet details with filtering and export capabilities.
 *
 * Requirements:
 * 1. Display 16 columns with proper data joins
 * 2. Enable MUI GridToolbar for filtering and exporting
 * 3. Support write-off functionality with reason selection
 * 4. Prevent write-off of shipped pallets
 * 5. Log all write-off actions for audit trail
 */

import React, { useCallback, useEffect, useState } from "react";
import {
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
	Select,
	TextField,
	Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbar, useGridApiRef } from "@mui/x-data-grid";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { useSnackbar } from "notistack";

import { manifests, pallets, products, receivingOrders, shippingOrders } from "../../lib/api/wms-api";
import type { Manifest, Pallet, Product, ReceivingOrder, ShippingOrder } from "../../types/domain";

type WriteOffReason = "Damaged" | "Lost" | "Count Correction";

interface InventoryRow {
	id: string;
	palletId: string;
	itemCode: string;
	description: string;
	qty: number;
	palletPositions: number;
	status: string;
	isCrossDock: boolean;
	location: string | null;
	inboundRef: string | null;
	inboundSeal: string | null;
	receivedDate: string | null;
	outboundRef: string | null;
	shipType: string | null;
	outboundManifest: string | null;
	outboundSeal: string | null;
	shippedDate: string | null;
}

export default function Screen15() {
	const { enqueueSnackbar } = useSnackbar();

	const [rows, setRows] = useState<InventoryRow[]>([]);
	const [filteredRows, setFilteredRows] = useState<InventoryRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedPalletId, setSelectedPalletId] = useState<string | null>(null);
	const [showWriteOffDialog, setShowWriteOffDialog] = useState(false);
	const [writeOffReason, setWriteOffReason] = useState<WriteOffReason>("Damaged");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const apiRef = useGridApiRef();

	// Load all inventory data on mount
	const loadInventoryData = useCallback(async () => {
		try {
			setLoading(true);

			// Fetch all pallets
			const allPallets = await pallets.getFiltered({});

			// Fetch all related data
			const [allProducts, allReceivingOrders, allShippingOrders, allManifests] = await Promise.all([
				products.getAll(),
				receivingOrders.getAll(),
				shippingOrders.getAll(),
				manifests.getAll(),
			]);

			// Build lookup maps for efficient joins
			const productMap = new Map(allProducts.map((p: Product) => [p.item_id, p]));
			const receivingOrderMap = new Map(allReceivingOrders.map((ro: ReceivingOrder) => [ro.id, ro]));
			const shippingOrderMap = new Map(allShippingOrders.map((so: ShippingOrder) => [so.id, so]));
			const manifestMap = new Map(allManifests.map((m: Manifest) => [m.id, m]));

			// Combine all data into inventory rows
			const inventoryRows: InventoryRow[] = allPallets.map((pallet: Pallet) => {
				const product = productMap.get(pallet.item_id);
				const receivingOrder = pallet.receiving_order_id ? receivingOrderMap.get(pallet.receiving_order_id) : null;
				const shippingOrder = pallet.shipping_order_id ? shippingOrderMap.get(pallet.shipping_order_id) : null;
				const manifest = pallet.manifest_id ? manifestMap.get(pallet.manifest_id) : null;

				return {
					id: pallet.id,
					palletId: pallet.id.slice(-8), // Use last 8 chars of pallet.id
					itemCode: pallet.item_id || "",
					description: product?.description || "",
					qty: pallet.qty || 0,
					palletPositions: product?.pallet_positions || 0,
					status: pallet.status || "Unknown",
					isCrossDock: pallet.is_cross_dock || false,
					location: pallet.location_id || null,
					inboundRef: receivingOrder?.container_num || null,
					inboundSeal: receivingOrder?.seal_num || null,
					receivedDate: pallet.received_at || null,
					outboundRef: shippingOrder?.order_ref || null,
					shipType: shippingOrder?.shipment_type || null,
					outboundManifest: manifest
						? manifest.type === "Container"
							? manifest.container_num || null
							: manifest.id.slice(-8) // Show manifest ID for Hand manifests
						: null,
					outboundSeal: manifest?.seal_num || null,
					shippedDate: pallet.shipped_at || null,
				};
			});

			setRows(inventoryRows);
			setFilteredRows(inventoryRows);
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to load inventory data";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		loadInventoryData();
	}, [loadInventoryData]);

	// Handle search filtering
	const handleSearch = () => {
		if (!searchQuery.trim()) {
			setFilteredRows(rows);
			return;
		}

		const query = searchQuery.toLowerCase().trim();
		const filtered = rows.filter(
			(row) =>
				row.itemCode.toLowerCase().includes(query) ||
				row.id.toLowerCase().includes(query) ||
				row.palletId.toLowerCase().includes(query)
		);

		setFilteredRows(filtered);

		if (filtered.length === 0) {
			enqueueSnackbar("No pallets found matching your search", { variant: "info" });
		}
	};

	// Clear search
	const handleClearSearch = () => {
		setSearchQuery("");
		setFilteredRows(rows);
	};

	// Handle CSV export
	const handleExport = () => {
		if (apiRef.current) {
			apiRef.current.exportDataAsCsv({
				fileName: `inventory-export-${new Date().toISOString().split("T")[0]}`,
				utf8WithBom: true,
			});
		}
	};

	// Handle write-off button click
	const handleWriteOffClick = (palletId: string, status: string) => {
		// Check if pallet is already shipped
		if (status === "Shipped") {
			enqueueSnackbar("Cannot write off shipped pallets", { variant: "error" });
			return;
		}

		setSelectedPalletId(palletId);
		setShowWriteOffDialog(true);
	};

	// Handle write-off confirmation
	const handleWriteOffConfirm = async () => {
		if (!selectedPalletId) return;

		try {
			setIsSubmitting(true);

			// Update pallet status to WriteOff
			await pallets.update(selectedPalletId, {
				status: "WriteOff",
			});

			// Log write-off action
			logWriteOff(selectedPalletId, writeOffReason);

			enqueueSnackbar(`Pallet written off as ${writeOffReason}`, { variant: "success" });

			// Reset state and reload data
			setShowWriteOffDialog(false);
			setSelectedPalletId(null);
			setWriteOffReason("Damaged");
			loadInventoryData();
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
		const _logEntry = {
			palletId,
			reason,
			timestamp,
			user: "current-user", // TODO: Get from auth context
			action: "WRITE_OFF",
		};
		// TODO: Save to Supabase audit log table if needed
	};

	// Define columns for DataGrid
	const columns: GridColDef[] = [
		{ field: "palletId", headerName: "Pallet ID", width: 120 },
		{ field: "itemCode", headerName: "Item Code", width: 130 },
		{ field: "description", headerName: "Description", width: 200 },
		{ field: "qty", headerName: "Qty", width: 80, type: "number" },
		{ field: "palletPositions", headerName: "Pallet Pos.", width: 100, type: "number" },
		{ field: "status", headerName: "Status", width: 120 },
		{
			field: "isCrossDock",
			headerName: "Is Cross Dock",
			width: 130,
			valueGetter: (value: boolean) => (value ? "Yes" : "No"),
		},
		{ field: "location", headerName: "Location", width: 150 },
		{ field: "inboundRef", headerName: "Inbound Ref", width: 130 },
		{ field: "inboundSeal", headerName: "Inbound Seal", width: 130 },
		{
			field: "receivedDate",
			headerName: "Received Date",
			width: 150,
			valueGetter: (value: string | null) => (value ? new Date(value).toLocaleDateString() : "N/A"),
		},
		{ field: "outboundRef", headerName: "Outbound Ref", width: 130 },
		{ field: "shipType", headerName: "Ship Type", width: 150 },
		{ field: "outboundManifest", headerName: "Outbound Mnfst", width: 150 },
		{ field: "outboundSeal", headerName: "Outbound Seal", width: 130 },
		{
			field: "shippedDate",
			headerName: "Shipped Date",
			width: 150,
			valueGetter: (value: string | null) => (value ? new Date(value).toLocaleDateString() : "N/A"),
		},
		{
			field: "actions",
			headerName: "Actions",
			width: 120,
			sortable: false,
			filterable: false,
			renderCell: (params) => (
				<Button
					size="small"
					variant="outlined"
					color="error"
					startIcon={<TrashIcon size={16} />}
					onClick={() => handleWriteOffClick(params.row.id, params.row.status)}
					disabled={params.row.status === "Shipped"}
				>
					Write Off
				</Button>
			),
		},
	];

	return (
		<Box sx={{ p: 3, height: "calc(100vh - 100px)" }}>
			{/* Header */}
			<Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
				Inventory Grid
			</Typography>

			{/* Search Card */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
						Search Inventory
					</Typography>

					<Box sx={{ display: "flex", gap: 2 }}>
						<TextField
							label="Search by Item ID or Pallet ID"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && handleSearch()}
							fullWidth
							placeholder="e.g., ITEM-001 or ...A1B2C3D4"
							size="small"
						/>
						<Button
							variant="contained"
							startIcon={<MagnifyingGlassIcon />}
							onClick={handleSearch}
							sx={{ minWidth: "120px" }}
						>
							Search
						</Button>
						{searchQuery && (
							<Button variant="outlined" onClick={handleClearSearch} sx={{ minWidth: "100px" }}>
								Clear
							</Button>
						)}
					</Box>

					{searchQuery && (
						<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
							Showing {filteredRows.length} of {rows.length} pallets
						</Typography>
					)}
				</CardContent>
			</Card>

			{/* Export Button */}
			<Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
				<Button variant="contained" color="primary" onClick={handleExport} disabled={filteredRows.length === 0}>
					📤 Export to CSV ({filteredRows.length} rows)
				</Button>
			</Box>

			{/* DataGrid with all 16 columns */}
			<Box sx={{ height: "calc(100% - 260px)", width: "100%" }}>
				<DataGrid
					apiRef={apiRef}
					rows={filteredRows}
					columns={columns}
					loading={loading}
					pageSizeOptions={[25, 50, 100]}
					initialState={{
						pagination: {
							paginationModel: { pageSize: 25, page: 0 },
						},
					}}
					slots={{
						toolbar: GridToolbar,
					}}
					slotProps={{
						toolbar: {
							showQuickFilter: true,
							quickFilterProps: { debounceMs: 500 },
							csvOptions: {
								fileName: `inventory-export-${new Date().toISOString().split("T")[0]}`,
								delimiter: ",",
								utf8WithBom: true,
							},
							printOptions: {
								hideFooter: true,
								hideToolbar: true,
							},
						},
					}}
					disableRowSelectionOnClick
					sx={{
						"& .MuiDataGrid-cell": {
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
						},
					}}
				/>
			</Box>

			{/* Write-Off Dialog */}
			<Dialog open={showWriteOffDialog} onClose={() => setShowWriteOffDialog(false)}>
				<DialogTitle>Write Off Pallet</DialogTitle>
				<DialogContent sx={{ minWidth: "400px", pt: 2 }}>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Pallet ID: <strong>{selectedPalletId}</strong>
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
