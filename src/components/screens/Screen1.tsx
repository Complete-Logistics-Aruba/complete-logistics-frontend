/* eslint-disable unicorn/filename-case */
/**
 * Screen 1: Create Receiving Order
 *
 * Allows CSE users to create receiving orders by uploading container info and CSV.
 * Validates CSV data and creates receiving order with line items.
 *
 * @component
 * @module components/screens/Screen1
 */

import React, { useEffect, useState } from "react";
import { validateReceivingOrderCSV } from "@/utils/csv-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Product, User } from "@/types/domain";
import { wmsApi } from "@/lib/api";
import { formatContainerNumber, getContainerNumberPlaceholder } from "@/lib/formatters";
import { receivingOrderSchema } from "@/lib/validators";
import { FileUpload, LoadingSpinner } from "@/components/core";

// Form schema
const receivingOrderFormSchema = receivingOrderSchema;

type ReceivingOrderFormData = z.infer<typeof receivingOrderSchema>;

/**
 * Screen 1 Component - Create Receiving Order
 *
 * @returns Screen1 component
 */
export function Screen1() {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [csvFile, setCsvFile] = useState<File | null>(null);
	const [csvData, setCsvData] = useState<Record<string, string>[] | null>(null);
	const [csvErrors, setCsvErrors] = useState<Array<{ row: number; field: string; message: string }>>([]);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [successData, setSuccessData] = useState<{ orderId: string; containerNum: string; sealNum: string } | null>(
		null
	);

	// Get current user on mount
	useEffect(() => {
		const getCurrentUser = async () => {
			try {
				const user = await wmsApi.auth.getCurrentUser();
				setCurrentUser(user);
			} catch {
				enqueueSnackbar("Failed to get current user", { variant: "error" });
			}
		};
		getCurrentUser();
	}, [enqueueSnackbar]);

	// Note: Supabase's autoRefreshToken handles session management automatically
	// No need for manual refresh - it works across tab switches

	const {
		register,
		handleSubmit,
		formState: { errors: formErrors },
		watch,
		reset,
		setValue,
	} = useForm<ReceivingOrderFormData>({
		resolver: zodResolver(receivingOrderFormSchema),
	});

	// Watch container number to format it automatically
	const containerNumValue = watch("container_num");

	// Format container number on change
	const handleContainerNumChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatContainerNumber(event.target.value);
		setValue("container_num", formatted);
	};

	// Note: containerNum and sealNum are watched but not used in this component
	// They are available for future use or debugging
	watch("container_num");
	watch("seal_num");

	// Handle CSV file upload
	const handleCsvUpload = async (file: File) => {
		setCsvFile(file);
		setCsvData(null);
		setCsvErrors([]);
		setLoading(true);

		try {
			// Supabase autoRefreshToken handles session refresh automatically
			// No need to manually call getSession() - it can hang
			// Get products for validation
			let products: Product[] = [];
			try {
				products = await wmsApi.products.getAll();
			} catch (error) {
				const message = error instanceof Error ? error.message : "Failed to load products";
				console.warn(`Warning loading products: ${message}`);
				// Don't fail - allow CSV upload even if products can't be loaded
				// Validation will happen at submission time
			}

			// If no products, still allow CSV to be uploaded (will validate at submission)
			if (!products || products.length === 0) {
				enqueueSnackbar("⚠️ No products in system yet. CSV will be validated when you submit.", { variant: "info" });
				// Still parse and show the CSV data
				const { parseCSV, readFileAsText } = await import("@/utils/csv-validation");
				const content = await readFileAsText(file);
				const rows = parseCSV(content);
				setCsvData(rows);
				enqueueSnackbar(`✅ CSV uploaded: ${rows.length} items (will validate on submit)`, { variant: "success" });
				setLoading(false);
				return;
			}

			// Validate CSV with products
			const result = await validateReceivingOrderCSV(file, products);

			if (!result.valid) {
				setCsvErrors(result.errors);
				enqueueSnackbar(`❌ CSV validation failed: ${result.errors.length} errors found`, { variant: "error" });
				setLoading(false);
				return;
			}

			setCsvData(result.data);
			enqueueSnackbar(`✅ CSV validated: ${result.data.length} items ready to import`, { variant: "success" });
			setLoading(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to validate CSV";
			console.error("CSV upload error:", error);
			setCsvErrors([]);
			enqueueSnackbar(`❌ Error: ${message}`, { variant: "error" });
			setLoading(false);
		}
	};

	// Handle form submission
	const onSubmit = async (data: ReceivingOrderFormData) => {
		if (!csvData || csvData.length === 0) {
			enqueueSnackbar("Please upload and validate a CSV file", { variant: "error" });
			return;
		}

		if (!currentUser) {
			enqueueSnackbar("User not authenticated", { variant: "error" });
			return;
		}

		setLoading(true);
		try {
			// Check for duplicate receiving orders with same container and seal
			const existingOrders = await wmsApi.receivingOrders.list();
			const duplicate = existingOrders.find(
				(order: { id: string; container_num: string; seal_num: string }) =>
					order.container_num.toLowerCase() === data.container_num.toLowerCase() &&
					order.seal_num.toLowerCase() === data.seal_num.toLowerCase()
			);

			if (duplicate) {
				enqueueSnackbar(
					`⚠️ A receiving order already exists for container ${data.container_num} with seal ${data.seal_num} (Order ID: ${duplicate.id})`,
					{ variant: "warning", autoHideDuration: 6000 }
				);
				setLoading(false);
				return;
			}

			// Create receiving order
			const receivingOrderData = {
				container_num: data.container_num,
				seal_num: data.seal_num,
				status: "Pending" as const,
				created_by: currentUser?.id || "system",
			};
			const receivingOrder = await wmsApi.receivingOrders.create(receivingOrderData);

			// Create receiving order lines
			for (const row of csvData) {
				await wmsApi.receivingOrderLines.create({
					receiving_order_id: receivingOrder.id,
					item_id: row.item_id,
					expected_qty: Number.parseInt(row.qty, 10),
				});
			}

			// Save original CSV to storage
			if (csvFile) {
				const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
				const fileName = `${receivingOrder.id}/original_${timestamp}.csv`;
				await wmsApi.storage.upload("receiving", fileName, csvFile);
			}

			// Show success
			setSuccessData({
				orderId: receivingOrder.id,
				containerNum: data.container_num,
				sealNum: data.seal_num,
			});
			setShowConfirmModal(true);

			// Reset form and clear CSV data after successful creation
			reset();
			setCsvFile(null);
			setCsvData(null);
			setCsvErrors([]);

			enqueueSnackbar(`✅ Receiving order created: Container ${data.container_num}, Seal ${data.seal_num}`, {
				variant: "success",
			});
		} catch (error) {
			console.error("Error creating receiving order:", error);
			const message = error instanceof Error ? error.message : "Failed to create receiving order";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	const handleConfirmClose = () => {
		setShowConfirmModal(false);
		// Don't navigate - CSE user stays on Screen 1
		// WH user will access Screen 5 from sidebar independently
	};

	return (
		<>
			<Helmet>
				<title>Screen 1: Create Receiving Order - Complete Logistics System</title>
			</Helmet>

			<Container maxWidth="lg" sx={{ py: 4 }}>
				<Stack spacing={4}>
					{/* Header */}
					<Box>
						<Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
							Screen 1: Create Receiving Order
						</Typography>
						<Typography variant="body1" color="textSecondary">
							Create a new receiving order by providing container details and uploading item quantities
						</Typography>
					</Box>

					{/* Form */}
					<Card>
						<CardContent>
							<form onSubmit={handleSubmit(onSubmit)}>
								<Stack spacing={3}>
									{/* Container Number */}
									<TextField
										label="Container Number *"
										placeholder={getContainerNumberPlaceholder()}
										{...register("container_num")}
										onChange={handleContainerNumChange}
										value={containerNumValue || ""}
										error={!!formErrors.container_num}
										helperText={formErrors.container_num?.message || "Format: CONT-1234567 (4 letters, 7 numbers)"}
										fullWidth
										disabled={loading}
									/>

									{/* Seal Number */}
									<TextField
										label="Seal Number *"
										placeholder="e.g., SEAL-67890"
										{...register("seal_num")}
										error={!!formErrors.seal_num}
										helperText={formErrors.seal_num?.message}
										fullWidth
										disabled={loading}
									/>

									{/* CSV Upload */}
									<Box>
										<Typography variant="subtitle2" sx={{ mb: 2, fontWeight: "bold" }}>
											Receiving CSV *
										</Typography>
										<FileUpload
											accept=".csv"
											maxSize={5 * 1024 * 1024}
											onUpload={handleCsvUpload}
											buttonText="Upload Receiving CSV"
											loading={loading}
										/>
										<Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
											CSV format: item_id, qty (qty must be multiple of units_per_pallet)
										</Typography>
									</Box>

									{/* CSV Validation Errors */}
									{csvErrors.length > 0 && (
										<Alert severity="error">
											<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
												CSV Validation Errors ({csvErrors.length})
											</Typography>
											<TableContainer component={Paper} sx={{ maxHeight: 300 }}>
												<Table size="small">
													<TableHead>
														<TableRow sx={{ bgcolor: "#f5f5f5" }}>
															<TableCell>Row</TableCell>
															<TableCell>Field</TableCell>
															<TableCell>Error</TableCell>
														</TableRow>
													</TableHead>
													<TableBody>
														{csvErrors.map((err, idx) => (
															<TableRow key={idx}>
																<TableCell>{err.row}</TableCell>
																<TableCell>{err.field}</TableCell>
																<TableCell>{err.message}</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</TableContainer>
										</Alert>
									)}

									{/* CSV Data Preview */}
									{csvData && csvData.length > 0 && (
										<Alert severity="success">
											<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
												✅ CSV Valid: {csvData.length} items ready to import
											</Typography>
											<TableContainer component={Paper} sx={{ maxHeight: 300 }}>
												<Table size="small">
													<TableHead>
														<TableRow sx={{ bgcolor: "#f5f5f5" }}>
															<TableCell>Item ID</TableCell>
															<TableCell align="right">Qty</TableCell>
														</TableRow>
													</TableHead>
													<TableBody>
														{csvData.slice(0, 10).map((row, idx) => (
															<TableRow key={idx}>
																<TableCell>{row.item_id}</TableCell>
																<TableCell align="right">{row.qty}</TableCell>
															</TableRow>
														))}
														{csvData.length > 10 && (
															<TableRow>
																<TableCell colSpan={2} align="center">
																	... and {csvData.length - 10} more items
																</TableCell>
															</TableRow>
														)}
													</TableBody>
												</Table>
											</TableContainer>
										</Alert>
									)}

									{/* Submit Button */}
									<Button
										type="submit"
										variant="contained"
										size="large"
										disabled={loading || !csvData || csvData.length === 0}
										sx={{ mt: 2 }}
									>
										{loading ? "Creating Order..." : "Create Receiving Order"}
									</Button>
								</Stack>
							</form>
						</CardContent>
					</Card>

					{/* Loading State */}
					{loading && <LoadingSpinner message="Creating receiving order and saving CSV..." />}
				</Stack>
			</Container>

			{/* Success Confirmation Modal */}
			<Dialog open={showConfirmModal} onClose={handleConfirmClose} maxWidth="sm" fullWidth>
				<DialogTitle>✅ Receiving Order Created</DialogTitle>
				<DialogContent sx={{ pt: 2 }}>
					<Stack spacing={2}>
						<Typography>
							<strong>Order ID:</strong> {successData?.orderId}
						</Typography>
						<Typography>
							<strong>Container:</strong> {successData?.containerNum}
						</Typography>
						<Typography>
							<strong>Seal:</strong> {successData?.sealNum}
						</Typography>
						<Alert severity="success">
							Receiving order has been created successfully. The warehouse team will now process this order starting
							with container photos (Screen 5).
						</Alert>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleConfirmClose} variant="contained">
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}

export default Screen1;
