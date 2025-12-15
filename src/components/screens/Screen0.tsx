/* eslint-disable unicorn/filename-case */
/**
 * Screen 0: Product Master Upload
 *
 * Allows CSE users to upload product master data via CSV.
 * Validates, stores in database, and archives to storage.
 *
 * @component
 * @module components/screens/Screen0
 */

import React, { useState } from "react";
import { validateProductMasterCSV } from "@/utils/csv-validation";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Container,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { Download as DownloadIcon } from "@phosphor-icons/react/dist/ssr/Download";
import { useSnackbar } from "notistack";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

import { paths } from "@/paths";
import { wmsApi } from "@/lib/api";
import { supabase } from "@/lib/auth/supabase-client";
import { ErrorAlert, FileUpload, LoadingSpinner, SuccessAlert } from "@/components/core";

const downloadTemplate = () => {
	const csvContent = `item_id,description,units_per_pallet,pallet_positions
PROD-001,Premium Wireless Headphones,500,1
PROD-002,Mechanical Gaming Keyboard RGB,500,1
PROD-003,27-inch 4K Monitor,500,1
PROD-004,Ergonomic Office Chair,500,1
PROD-005,500GB NVMe SSD,500,1`;

	const blob = new Blob([csvContent], { type: "text/csv" });
	const url = globalThis.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "product-master-template.csv";
	document.body.append(link);
	link.click();
	link.remove();
	globalThis.URL.revokeObjectURL(url);
};

/**
 * Screen 0 Component - Product Master Upload
 *
 * @returns Screen0 component
 */
export function Screen0() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<{ message: string; count: number } | null>(null);
	const [validationErrors, setValidationErrors] = useState<Array<{ row: number; field: string; message: string }>>([]);
	const [csvUploaded, setCsvUploaded] = useState(false);

	// Note: Supabase's autoRefreshToken handles session management automatically
	// No need for manual refresh - it works across tab switches

	const handleFileUpload = async (file: File) => {
		setLoading(true);
		setError(null);
		setSuccess(null);
		setValidationErrors([]);

		try {
			// Supabase autoRefreshToken handles session refresh automatically
			// No need to manually call getSession() - it can hang
			// Validate CSV
			let result;
			try {
				result = await validateProductMasterCSV(file);
			} catch (error_) {
				const message = error_ instanceof Error ? error_.message : "Failed to validate CSV";
				console.error("CSV validation error:", error_);
				setError(`CSV validation error: ${message}`);
				enqueueSnackbar(`CSV validation error: ${message}`, { variant: "error" });
				setLoading(false);
				return;
			}

			if (!result.valid) {
				console.error("CSV validation failed with errors:", result.errors);
				setValidationErrors(result.errors);
				setError(`CSV validation failed: ${result.errors.length} errors found`);
				setLoading(false);
				return;
			}

			// Transform data for database
			const products = result.data.map((row) => ({
				item_id: row.item_id,
				description: row.description || "",
				units_per_pallet: Number.parseInt(row.units_per_pallet, 10),
				pallet_positions: row.pallet_positions ? Number.parseInt(row.pallet_positions, 10) : 1,
				active: true,
			}));

			// Truncate existing products (delete all with cascade)
			// Skip delete if there are no existing products to improve performance
			try {
				// Quick check: count existing products
				const { error: countError } = await supabase.from("products").select("*", { count: "exact", head: true });

				if (countError) {
					console.warn("Could not check existing products, skipping delete:", countError.message);
					// Continue anyway - might be a permissions issue
				} else {
					// Helper function to safely delete with timeout
					const safeDelete = async (table: string) => {
						try {
							const result = await Promise.race([
								supabase.from(table).delete().gte("created_at", "1900-01-01"),
								new Promise((_, reject) => setTimeout(() => reject(new Error(`Delete timeout for ${table}`)), 15_000)),
							]);
							const { error } = result as { error: { code?: string; message?: string } | null };

							if (error) {
								// Ignore "table not found" errors - it's okay if table doesn't exist
								if (error.code === "PGRST205" || error.message?.includes("not found")) {
									console.warn(`Table ${table} not found or empty, continuing...`);
									return;
								}
								throw error;
							}
						} catch (error_) {
							// Ignore table not found errors
							const message = error_ instanceof Error ? error_.message : String(error_);
							if (message.includes("not found") || message.includes("PGRST205") || message.includes("timeout")) {
								console.warn(`Table ${table} delete failed/timed out, continuing...`);
								return;
							}
							throw error_;
						}
					};

					// Delete in order (with timeout protection)
					await safeDelete("receiving_order_lines");
					await safeDelete("shipping_order_lines");
					await safeDelete("pallets");
					await safeDelete("receiving_orders");
					await safeDelete("shipping_orders");
					await safeDelete("products");
				}
			} catch (error_) {
				let message = "Unknown error";
				if (error_ instanceof Error) {
					message = error_.message;
				} else if (error_ && typeof error_ === "object" && "message" in error_) {
					message = String((error_ as unknown as Record<string, unknown>).message);
				}
				console.error("Failed to clear existing data:", message);
				// Don't throw - allow upload to continue even if delete fails
				console.warn("Continuing with product upload despite delete error...");
			}

			// Insert new products with retry logic
			let insertedCount = 0;
			for (const product of products) {
				let retries = 0;
				const maxRetries = 2;
				let lastError: Error | null = null;

				while (retries <= maxRetries) {
					try {
						await wmsApi.products.create(product);
						insertedCount++;
						break; // Success, exit retry loop
					} catch (error_) {
						lastError = error_ instanceof Error ? error_ : new Error(String(error_));
						const message = lastError.message;
						console.error(`Error inserting product ${product.item_id} (attempt ${retries + 1}):`, message);

						if (retries < maxRetries) {
							// Wait before retrying (exponential backoff)
							const waitTime = Math.pow(2, retries) * 1000;
							await new Promise((resolve) => setTimeout(resolve, waitTime));
							retries++;
						} else {
							// Max retries exceeded
							throw new Error(
								`Failed to insert product ${product.item_id} after ${maxRetries + 1} attempts: ${message}`
							);
						}
					}
				}
			}
			// Save original CSV to storage
			try {
				const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
				const fileName = `products/master_${timestamp}.csv`;
				await wmsApi.storage.upload("receiving", fileName, file);
			} catch (error_) {
				const message = error_ instanceof Error ? error_.message : "Failed to save CSV";
				console.warn("Warning: Could not save CSV to storage:", message);
				// Don't fail the entire operation if storage fails
			}

			// Success
			setSuccess({
				message: `Product master updated: ${insertedCount} items loaded`,
				count: insertedCount,
			});
			setCsvUploaded(true);
			enqueueSnackbar(`✅ Successfully loaded ${insertedCount} products`, { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to upload products";
			console.error("Upload failed:", error_);
			setError(message);
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Helmet>
				<title>Product Master Upload - Complete Logistics System</title>
			</Helmet>

			<Container maxWidth="lg" sx={{ py: 4 }}>
				<Stack spacing={4}>
					{/* Header */}
					<Box>
						<Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
							Screen 0: Product Master Upload
						</Typography>
						<Typography variant="body1" color="textSecondary">
							Upload a CSV file to initialize or update the product catalog
						</Typography>
					</Box>

					{/* CSV Format Instructions */}
					<Card sx={{ border: "2px solid #e3f2fd" }}>
						<CardContent>
							<Stack spacing={3}>
								{/* Header */}
								<Box>
									<Typography variant="h6" sx={{ mb: 1, fontWeight: "bold" }}>
										📋 CSV Format Requirements
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Your CSV file must contain the following columns in this exact order:
									</Typography>
								</Box>

								{/* Column Specifications Table */}
								<TableContainer component={Paper} sx={{ bgcolor: "#fafafa" }}>
									<Table size="small">
										<TableHead>
											<TableRow sx={{ bgcolor: "#e3f2fd" }}>
												<TableCell sx={{ fontWeight: "bold" }}>Column Name</TableCell>
												<TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
												<TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
												<TableCell sx={{ fontWeight: "bold" }}>Example</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											<TableRow>
												<TableCell>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<code>item_id</code>
														<Chip label="Required" size="small" color="error" variant="outlined" />
													</Box>
												</TableCell>
												<TableCell>Text</TableCell>
												<TableCell>Unique product identifier</TableCell>
												<TableCell>
													<code>PROD-001</code>
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<code>description</code>
														<Chip label="Optional" size="small" color="warning" variant="outlined" />
													</Box>
												</TableCell>
												<TableCell>Text</TableCell>
												<TableCell>Product name/description</TableCell>
												<TableCell>
													<code>Wireless Headphones</code>
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<code>units_per_pallet</code>
														<Chip label="Required" size="small" color="error" variant="outlined" />
													</Box>
												</TableCell>
												<TableCell>Number</TableCell>
												<TableCell>Units that fit on one pallet</TableCell>
												<TableCell>
													<code>500</code>
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<code>pallet_positions</code>
														<Chip label="Optional" size="small" color="warning" variant="outlined" />
													</Box>
												</TableCell>
												<TableCell>Number</TableCell>
												<TableCell>Number of pallet positions (defaults to 1)</TableCell>
												<TableCell>
													<code>1</code>
												</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</TableContainer>

								{/* Example CSV */}
								{/* <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    ✅ Example CSV Format:
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: '#f5f5f5',
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      border: '1px solid #ddd',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {`item_id,description,units_per_pallet,pallet_positions
PROD-001,Premium Wireless Headphones,500,1
PROD-002,Mechanical Gaming Keyboard RGB,500,1
PROD-003,27-inch 4K Monitor,500,1
PROD-004,Ergonomic Office Chair,500,1
PROD-005,500GB NVMe SSD,500,1`}
                  </Box>
                </Box> */}

								{/* Download Template Button */}
								<Box sx={{ display: "flex", gap: 2 }}>
									<Button
										variant="outlined"
										startIcon={<DownloadIcon size={20} />}
										onClick={downloadTemplate}
										sx={{ textTransform: "none" }}
									>
										Download CSV Template
									</Button>
									<Alert severity="info" sx={{ flex: 1, display: "flex", alignItems: "center" }}>
										💡 Download the template to get started quickly
									</Alert>
								</Box>
							</Stack>
						</CardContent>
					</Card>

					{/* Upload Area */}
					<Card>
						<CardContent>
							<Stack spacing={3}>
								{loading ? (
									<LoadingSpinner message="Processing CSV and uploading products..." />
								) : (
									<>
										<FileUpload
											accept=".csv"
											maxSize={5 * 1024 * 1024}
											onUpload={handleFileUpload}
											buttonText="Upload Product Master CSV"
										/>

										{error && <ErrorAlert message={error} onClose={() => setError(null)} />}

										{success && <SuccessAlert message={success.message} onClose={() => setSuccess(null)} />}
									</>
								)}
							</Stack>
						</CardContent>
					</Card>

					{/* Validation Errors */}
					{validationErrors.length > 0 && (
						<Card sx={{ borderColor: "error.main", borderWidth: 1 }}>
							<CardContent>
								<Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "error.main" }}>
									Validation Errors ({validationErrors.length})
								</Typography>
								<TableContainer component={Paper}>
									<Table size="small">
										<TableHead>
											<TableRow sx={{ bgcolor: "#f5f5f5" }}>
												<TableCell>Row</TableCell>
												<TableCell>Field</TableCell>
												<TableCell>Error</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{validationErrors.map((err, index) => (
												<TableRow key={index}>
													<TableCell>{err.row}</TableCell>
													<TableCell>{err.field}</TableCell>
													<TableCell>{err.message}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
								<Alert severity="info" sx={{ mt: 2 }}>
									Please fix the errors above and re-upload the CSV file
								</Alert>
							</CardContent>
						</Card>
					)}

					{/* Next Button */}
					{csvUploaded && (
						<Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
							<Button
								variant="contained"
								endIcon={<ArrowRightIcon size={20} />}
								onClick={() => navigate(paths.warehouseScreens.screen0b)}
								size="large"
							>
								Next
							</Button>
						</Box>
					)}
				</Stack>
			</Container>
		</>
	);
}

export default Screen0;
