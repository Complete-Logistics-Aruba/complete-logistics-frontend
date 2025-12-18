/* eslint-disable unicorn/filename-case */
/**
 * Screen 14: Billing Report Summary
 *
 * CSE views pallet-position metrics for a date range to generate billing data.
 * Displays summary table with all billing metrics and hand delivery detail table.
 *
 * Story 8.1 & 8.2 Acceptance Criteria:
 * 1. Date inputs: From (required), To (required)
 * 2. Summary table displays metrics for date range
 * 3. All metrics in pallet positions (not pallet count)
 * 4. Display as single row with all metrics
 * 5. Detail table shows hand delivery orders with pallet positions
 * 6. Allow CSE to edit notes
 */

import React, { useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
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
import { DownloadIcon } from "@phosphor-icons/react/dist/ssr/Download";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { useSnackbar } from "notistack";

import { pallets, products, shippingOrders } from "../../lib/api/wms-api";
import type { BillingMetrics } from "../../types/domain";
import { calculateAllBillingMetrics } from "../../utils/billing";
import { exportBillingToCSV } from "../../utils/csv-export";
import { sendShippingEmail as _sendShippingEmail } from "../../utils/shipping-email";

interface HandDeliveryRow {
	orderId: string;
	orderRef: string;
	deliveryDate: string;
	totalPalletPositions: number;
	notes: string;
}

export default function Screen14() {
	const { enqueueSnackbar } = useSnackbar();

	const [fromDate, setFromDate] = useState<string>("");
	const [toDate, setToDate] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
	const [handDeliveryRows, setHandDeliveryRows] = useState<HandDeliveryRow[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Handle date change
	const handleFromDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFromDate(event.target.value);
	};

	const handleToDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setToDate(event.target.value);
	};

	// Validate dates
	const validateDates = (): boolean => {
		if (!fromDate) {
			enqueueSnackbar("From date is required", { variant: "error" });
			return false;
		}

		if (!toDate) {
			enqueueSnackbar("To date is required", { variant: "error" });
			return false;
		}

		const from = new Date(fromDate);
		const to = new Date(toDate);

		if (from > to) {
			enqueueSnackbar("From date must be before To date", { variant: "error" });
			return false;
		}

		return true;
	};

	// Handle generate report
	const handleGenerateReport = async () => {
		if (!validateDates()) return;

		try {
			setIsLoading(true);
			setError(null);

			// Fetch billing metrics for date range
			// Get all pallets and fetch product info for each
			const allPallets = await pallets.getFiltered({});
			// Enrich pallets with product and shipping order data
			const palletsWithProducts = await Promise.all(
				allPallets.map(async (pallet) => {
					try {
						const product = await products.getByItemId(pallet.item_id);
						let shippingOrder;

						// If pallet has shipping_order_id, fetch the shipping order
						if (pallet.shipping_order_id) {
							try {
								shippingOrder = await shippingOrders.getById(pallet.shipping_order_id);
							} catch (error) {
								console.warn(`Failed to fetch shipping order for pallet ${pallet.id}:`, error);
							}
						}

						return { ...pallet, product, shippingOrder };
					} catch (error) {
						console.warn(`Failed to fetch product for pallet ${pallet.id}:`, error);
						return pallet;
					}
				})
			);

			const billingMetrics = calculateAllBillingMetrics(palletsWithProducts, fromDate, toDate);
			// If metrics not available, use placeholder
			if (billingMetrics) {
				setMetrics(billingMetrics);
			} else {
				// Placeholder metrics when API not available
				setMetrics({
					storage_pallet_positions: 0,
					in_pallet_positions_standard: 0,
					cross_dock_pallet_positions: 0,
					out_pallet_positions_standard: 0,
					hand_delivery_pallet_positions: 0,
				});
			}

			// Fetch hand delivery orders for date range
			const allOrders = await shippingOrders.getAll();
			const handDeliveryOrders = allOrders.filter(
				(order) => order.status === "Shipped" && order.shipment_type === "Hand_Delivery"
			);

			// Build hand delivery rows with pallet positions
			const rows: HandDeliveryRow[] = [];
			for (const order of handDeliveryOrders) {
				// Check if order date is within range
				const orderDate = new Date(order.created_at);
				const from = new Date(fromDate);
				const to = new Date(toDate);
				to.setHours(23, 59, 59, 999); // Set to end of day
				if (orderDate < from || orderDate > to) continue;

				// Fetch pallets for this order
				const palletsList = await pallets.getFiltered({
					shipping_order_id: order.id,
					status: "Shipped",
				});

				// Calculate total pallet positions
				let totalPositions = 0;
				for (const pallet of palletsList) {
					const product = await products.getByItemId(pallet.item_id);
					totalPositions += product.pallet_positions || 0;
				}

				rows.push({
					orderId: order.id,
					orderRef: order.order_ref,
					deliveryDate: new Date(order.created_at).toLocaleDateString(),
					totalPalletPositions: totalPositions,
					notes: "",
				});
			}

			setHandDeliveryRows(rows);
			enqueueSnackbar("Report generated successfully", { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to generate report";
			setError(message);
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsLoading(false);
		}
	};

	// Handle CSV export
	const handleExportCSV = () => {
		if (!metrics) {
			enqueueSnackbar("No metrics to export. Please generate a report first.", { variant: "warning" });
			return;
		}

		try {
			// Convert handDeliveryRows to export format
			const exportRows = handDeliveryRows.map((row) => ({
				deliveryDate: row.deliveryDate,
				orderRef: row.orderRef,
				totalPalletPositions: row.totalPalletPositions,
				notes: row.notes,
			}));

			// Export to CSV
			exportBillingToCSV(metrics, exportRows, fromDate, toDate);

			enqueueSnackbar("CSV exported successfully", { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to export CSV";
			enqueueSnackbar(message, { variant: "error" });
		}
	};

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
				Billing Report Summary
			</Typography>

			{/* Date Range Card */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
						Select Date Range
					</Typography>

					<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
						<TextField
							label="From Date"
							type="date"
							value={fromDate}
							onChange={handleFromDateChange}
							InputLabelProps={{ shrink: true }}
							fullWidth
							disabled={isLoading}
						/>
						<TextField
							label="To Date"
							type="date"
							value={toDate}
							onChange={handleToDateChange}
							InputLabelProps={{ shrink: true }}
							fullWidth
							disabled={isLoading}
						/>
					</Box>

					<Button
						variant="contained"
						size="large"
						startIcon={<MagnifyingGlassIcon />}
						onClick={handleGenerateReport}
						disabled={isLoading}
						fullWidth
					>
						{isLoading ? <CircularProgress size={24} /> : "Generate Report"}
					</Button>
				</CardContent>
			</Card>

			{/* Error Alert */}
			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			{/* Metrics Summary Table */}
			{metrics && (
				<Card>
					<CardContent>
						<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
							Billing Metrics Summary
						</Typography>

						<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
							Date Range: {new Date(fromDate).toLocaleDateString()} to {new Date(toDate).toLocaleDateString()}
						</Typography>

						<TableContainer component={Paper}>
							<Table>
								<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Metric</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600 }}>
											Pallet Positions
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									<TableRow hover>
										<TableCell>Storage Pallet Positions</TableCell>
										<TableCell align="right">{metrics.storage_pallet_positions}</TableCell>
									</TableRow>
									<TableRow hover>
										<TableCell>In Pallet Positions (Standard)</TableCell>
										<TableCell align="right">{metrics.in_pallet_positions_standard}</TableCell>
									</TableRow>
									<TableRow hover>
										<TableCell>Cross-Dock Pallet Positions</TableCell>
										<TableCell align="right">{metrics.cross_dock_pallet_positions}</TableCell>
									</TableRow>
									<TableRow hover>
										<TableCell>Out Pallet Positions (Standard)</TableCell>
										<TableCell align="right">{metrics.out_pallet_positions_standard}</TableCell>
									</TableRow>
									<TableRow hover>
										<TableCell>Hand Delivery Pallet Positions</TableCell>
										<TableCell align="right">{metrics.hand_delivery_pallet_positions}</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>

						{/* Export Button */}
						<Box sx={{ mt: 2 }}>
							<Button
								variant="outlined"
								size="medium"
								startIcon={<DownloadIcon />}
								onClick={handleExportCSV}
								disabled={isLoading || !metrics}
							>
								Export CSV
							</Button>
						</Box>
					</CardContent>
				</Card>
			)}

			{/* Hand Delivery Detail Table */}
			{handDeliveryRows.length > 0 && (
				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
							Hand Delivery Orders Detail
						</Typography>

						<TableContainer component={Paper}>
							<Table>
								<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Delivery Date</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Shipping Order Ref</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600 }}>
											Total Pallet Positions
										</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{handDeliveryRows.map((row) => (
										<TableRow key={row.orderId} hover>
											<TableCell>{row.deliveryDate}</TableCell>
											<TableCell>{row.orderRef}</TableCell>
											<TableCell align="right">{row.totalPalletPositions}</TableCell>
											<TableCell>
												<Typography variant="body2">{row.notes || "-"}</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* Empty State */}
			{!metrics && !error && (
				<Alert severity="info">
					Select a date range and click &quot;Generate Report&quot; to view billing metrics.
				</Alert>
			)}
		</Box>
	);
}
