/* eslint-disable unicorn/filename-case */
/**
 * Screen 2: Receiving Summary Review & Form Upload
 *
 * CSE reviews expected vs received quantities to identify and document discrepancies.
 * CSE uploads signed receiving form for documentation.
 *
 * Story 4.1 Acceptance Criteria:
 * 1. Display receiving order (status=Staged)
 * 2. Table: Item ID, Description, Expected Qty, Received Qty, Difference
 * 3. Expected Qty = sum of expected_qty from receiving_order_lines
 * 4. Received Qty = SUM(pallet.qty) for this receiving_order
 * 5. Difference = Received - Expected (positive=overage, negative=shortage)
 * 6. Highlight rows with non-zero difference (yellow or red)
 * 7. Allow CSE to review and proceed or request recount
 *
 * Story 4.2 Acceptance Criteria:
 * 1. File upload section for final receiving form (PDF, JPEG, PNG)
 * 2. File saved to: `receiving/<receiving_order_id>/<filename>`
 * 3. Display uploaded file name and preview (if image)
 * 4. Allow replace/delete before sending email
 * 5. Error handling: file too large, invalid format, network error
 */

import React, { useEffect, useState } from "react";
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
	Typography,
} from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";

import type { ReceivingOrder } from "@/types/domain";
import { pallets, products, receivingOrderLines, receivingOrders, storage } from "@/lib/api/wms-api";
import { supabase } from "@/lib/auth/supabase-client";
import { fileUrlToBase64, sendEmail } from "@/lib/email-service";

interface _ReceivingLine {
	id: string;
	product_id: string;
	qty_expected: number;
	product?: {
		id: string;
		name: string;
	};
}

interface SummaryRow {
	lineId: string;
	itemId: string;
	description: string;
	expectedQty: number;
	receivedQty: number;
	difference: number;
	hasDiscrepancy: boolean;
}

export default function Screen2() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();

	const { receivingOrderId } = location.state || {};

	// State for order list
	const [stagedOrders, setStagedOrders] = useState<ReceivingOrder[]>([]);
	const [loadingOrders, setLoadingOrders] = useState(false);
	const [showOrderList, setShowOrderList] = useState(!receivingOrderId);
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(receivingOrderId || null);

	// State for order details
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
	const [orderStatus, setOrderStatus] = useState<string>("");
	const [totalExpected, setTotalExpected] = useState(0);
	const [totalReceived, setTotalReceived] = useState(0);
	const [containerNumState, setContainerNumState] = useState<string>("");
	const [sealNumState, setSealNumState] = useState<string>("");
	const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isConfirmed, setIsConfirmed] = useState(false);
	const [isSendingEmail, setIsSendingEmail] = useState(false);

	// Load all staged orders
	useEffect(() => {
		if (showOrderList) {
			const loadStagedOrders = async () => {
				try {
					setLoadingOrders(true);
					const orders = await receivingOrders.list();
					// Filter for Staged status only (Received orders are completed and should not appear in list)
					const staged = orders.filter((o: ReceivingOrder) => o.status === "Staged");
					setStagedOrders(staged);
					if (staged.length === 0) {
						enqueueSnackbar("No staged orders available for review", { variant: "info" });
					}
				} catch {
					enqueueSnackbar("Failed to load orders", { variant: "error" });
				} finally {
					setLoadingOrders(false);
				}
			};
			loadStagedOrders();
		}
	}, [showOrderList, enqueueSnackbar]);

	// Handle order selection from list
	const handleSelectOrder = (orderId: string) => {
		setSelectedOrderId(orderId);
		setShowOrderList(false);
		// Reset confirmation state when selecting a new order
		setIsConfirmed(false);
		setUploadedFile(null);
	};

	// Load order data
	useEffect(() => {
		const loadData = async () => {
			const orderId = selectedOrderId || receivingOrderId;

			if (!orderId) {
				return;
			}

			try {
				setIsLoading(true);

				// Fetch receiving order
				const order = await receivingOrders.getById(orderId);
				setOrderStatus(order.status);
				setContainerNumState(order.container_num || "");
				setSealNumState(order.seal_num || "");

				// Fetch receiving order lines
				const lines = await receivingOrderLines.getByReceivingOrderId(orderId);
				// Fetch all pallets for this receiving order
				let palletsList = await pallets.getFiltered({
					receiving_order_id: orderId,
				});

				// If no pallets found, retry once after a short delay (database replication lag)
				if (palletsList.length === 0) {
					await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
					palletsList = await pallets.getFiltered({
						receiving_order_id: orderId,
					});
				}

				// Build summary rows
				const rows: SummaryRow[] = [];
				let sumExpected = 0;
				let sumReceived = 0;

				for (const line of lines) {
					// Get product info
					const product = await products.getByItemId(line.item_id);

					// Calculate received qty for this line
					// Count ALL pallets for this item (both regular and cross-dock)
					// Cross-dock pallets are still "received" - they just ship immediately
					const palletsByItem = palletsList.filter((p) => p.item_id === line.item_id);
					const receivedQty = palletsByItem.reduce((sum, p) => sum + (p.qty || 0), 0);
					const difference = receivedQty - line.expected_qty;
					const hasDiscrepancy = difference !== 0;

					sumExpected += line.expected_qty;
					sumReceived += receivedQty || 0;

					rows.push({
						lineId: line.id,
						itemId: line.item_id,
						description: product.description,
						expectedQty: line.expected_qty,
						receivedQty,
						difference,
						hasDiscrepancy,
					});
				}

				setSummaryRows(rows);
				setTotalExpected(sumExpected);
				setTotalReceived(sumReceived);
			} catch (error) {
				console.error("Error loading data:", error);
				const message = error instanceof Error ? error.message : "Failed to load data";
				enqueueSnackbar(`Error: ${message}`, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [selectedOrderId, receivingOrderId, navigate, enqueueSnackbar]);

	const handleConfirmFinalCounts = async () => {
		const orderId = selectedOrderId || receivingOrderId;

		if (!orderId) {
			enqueueSnackbar("No receiving order selected", { variant: "error" });
			return;
		}

		try {
			setIsSubmitting(true);

			// DON'T update order status yet - only set local state
			// Order status should only change to "Received" after email is sent
			setIsConfirmed(true);
			enqueueSnackbar("✅ Counts confirmed! Now upload the receiving form and send email.", { variant: "success" });
		} catch (error) {
			console.error("Error confirming order:", error);
			const message = error instanceof Error ? error.message : "Failed to confirm order";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSendEmail = async () => {
		if (!uploadedFile) {
			enqueueSnackbar("Please upload a form before sending email", { variant: "warning" });
			return;
		}

		const orderId = selectedOrderId || receivingOrderId;

		if (!orderId) {
			enqueueSnackbar("No receiving order selected", { variant: "error" });
			return;
		}

		try {
			setIsSendingEmail(true);
			// Get email recipient from environment
			const emailTo = import.meta.env.VITE_RECEIVING_EMAIL_TO || "receiving@example.com";

			// Fetch receiving order for details
			const order = await receivingOrders.getById(orderId);

			// Build email body
			const emailBody = `
Cargo Received Notification

Container #: ${order.container_num || "N/A"}
Seal #: ${order.seal_num || "N/A"}
Order ID: ${orderId}

Summary:
- Total Expected: ${totalExpected} units
- Total Received: ${totalReceived} units
- Difference: ${totalReceived - totalExpected} units

Attached:
- Receiving Form (${uploadedFile.name})
- Container Photos (3 images)

Please review and confirm receipt.
			`.trim();

			// Convert uploaded form to base64
			const formBase64 = await fileUrlToBase64(uploadedFile.url);

			// Fetch container photos directly from storage
			const attachments = [
				{
					filename: uploadedFile.name,
					content: formBase64,
					contentType: uploadedFile.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
				},
			];

			// Get list of files in the receiving order folder
			try {
				const { data: files } = await supabase.storage.from("receiving").list(`${orderId}/`, {
					limit: 100,
					search: "photo_",
				});

				// Sort by name to get photos in order
				const photoFiles =
					files?.filter((f) => f.name.startsWith("photo_")).sort((a, b) => a.name.localeCompare(b.name)) || [];

				// Add container photos if available
				for (const [i, photoFile] of photoFiles.entries()) {
					if (photoFile) {
						try {
							const { data: urlData } = supabase.storage.from("receiving").getPublicUrl(`${orderId}/${photoFile.name}`);
							const photoUrl = urlData.publicUrl;
							const photoBase64 = await fileUrlToBase64(photoUrl);
							// Use the actual filename instead of index-based naming
							attachments.push({
								filename: photoFile.name.replace("photo_", "container-photo-"),
								content: photoBase64,
								contentType: "image/jpeg",
							});
						} catch (photoError) {
							console.warn(`[Screen 2] Failed to add photo ${i + 1}:`, photoError);
						}
					}
				}
			} catch (listError) {
				console.warn("[Screen 2] Failed to list photos from storage:", listError);
			}

			// Send email
			await sendEmail({
				to: emailTo,
				subject: `Cargo Received - Container ${order.container_num || "N/A"}`,
				body: emailBody,
				attachments,
			});

			// NOW update the receiving order status to 'Received' after email is sent
			await receivingOrders.update(orderId, {
				status: "Received",
			});

			// Update local state
			setOrderStatus("Received");
			enqueueSnackbar("✅ 'Cargo Received' email sent successfully and order marked as Received!", {
				variant: "success",
			});

			// Show success message for 3 seconds, then remove from list and navigate
			setTimeout(() => {
				// Remove the order from the staged orders list
				setStagedOrders((prev) => prev.filter((order) => order.id !== orderId));
				// Navigate back to warehouse
				navigate("/warehouse");
			}, 3000);
		} catch (error) {
			console.error("[Screen 2] Error sending email:", error);
			const message = error instanceof Error ? error.message : "Failed to send email";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSendingEmail(false);
		}
	};

	const handleFileUpload = async (file: File) => {
		// Validate file type
		const validTypes = ["application/pdf", "image/jpeg", "image/png"];
		if (!validTypes.includes(file.type)) {
			enqueueSnackbar("Invalid file format. Please upload PDF, JPEG, or PNG.", { variant: "error" });
			return;
		}

		// Validate file size (max 10MB)
		if (file.size > 10 * 1024 * 1024) {
			enqueueSnackbar("File size exceeds 10MB limit.", { variant: "error" });
			return;
		}

		try {
			setIsUploading(true);
			const orderId = selectedOrderId || receivingOrderId;

			if (!orderId) {
				enqueueSnackbar("No receiving order selected", { variant: "error" });
				return;
			}

			// Upload file to Supabase Storage
			// Sanitize filename to remove spaces and special characters that cause upload errors
			const sanitizedFileName = file.name
				.replaceAll(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars with underscores
				.replaceAll(/_{2,}/g, "_") // Replace multiple underscores with single
				.toLowerCase(); // Convert to lowercase for consistency
			const fileName = `${Date.now()}-${sanitizedFileName}`;
			const url = await storage.upload("receiving", `${orderId}/${fileName}`, file);
			setUploadedFile({ name: file.name, url });
			enqueueSnackbar(`✅ ${file.name} uploaded successfully`, { variant: "success" });
		} catch (error) {
			console.error("Error uploading file:", error);
			enqueueSnackbar("Failed to upload file", { variant: "error" });
		} finally {
			setIsUploading(false);
		}
	};

	// Show order selection list if no order selected
	if (showOrderList) {
		return (
			<Box sx={{ p: 3 }}>
				<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
					<Button startIcon={<ArrowLeftIcon size={20} />} onClick={() => navigate("/warehouse")} sx={{ mr: 2 }}>
						Back
					</Button>
					<Typography variant="h5" sx={{ fontWeight: "bold" }}>
						Select Receiving Order for Review
					</Typography>
				</Box>

				{loadingOrders ? (
					<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
						<CircularProgress />
					</Box>
				) : stagedOrders.length === 0 ? (
					<Alert severity="info">No staged orders available for review</Alert>
				) : (
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr",
								sm: "1fr",
								md: "repeat(2, 1fr)",
								lg: "repeat(3, 1fr)",
								xl: "repeat(4, 1fr)",
							},
							gap: 2,
						}}
					>
						{stagedOrders.map((order: ReceivingOrder) => (
							<Card
								key={order.id}
								onClick={() => handleSelectOrder(order.id)}
								sx={{
									cursor: "pointer",
									transition: "all 0.3s ease",
									borderRadius: 2,
									boxShadow: 2,
									border: "1px solid rgba(0, 0, 0, 0.08)",
									background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
									"&:hover": {
										boxShadow: 6,
										transform: "translateY(-2px)",
										borderColor: "primary.main",
										background: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
									},
								}}
							>
								<CardContent>
									<Typography variant="subtitle2" color="textSecondary" gutterBottom>
										Order ID
									</Typography>
									<Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
										{order.id.slice(0, 8)}...
									</Typography>

									<Typography variant="subtitle2" color="textSecondary" gutterBottom>
										Container #
									</Typography>
									<Typography variant="body2" sx={{ mb: 1 }}>
										{order.container_num}
									</Typography>

									<Typography variant="subtitle2" color="textSecondary" gutterBottom>
										Seal #
									</Typography>
									<Typography variant="body2" sx={{ mb: 2 }}>
										{order.seal_num}
									</Typography>

									<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<Typography variant="caption" color="textSecondary">
											Status: {order.status}
										</Typography>
										<Typography variant="caption" color="primary" sx={{ fontWeight: "bold" }}>
											Click to Review →
										</Typography>
									</Box>
								</CardContent>
							</Card>
						))}
					</Box>
				)}
			</Box>
		);
	}

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
				<CircularProgress />
			</Box>
		);
	}

	const hasDiscrepancies = summaryRows.some((row) => row.hasDiscrepancy);
	const totalDifference = totalReceived - totalExpected;

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
				<Button startIcon={<ArrowLeftIcon size={20} />} onClick={() => setShowOrderList(true)} sx={{ mr: 2 }}>
					Back to Orders
				</Button>
				<Typography variant="h5" sx={{ fontWeight: "bold", flex: 1 }}>
					Receiving Summary Review
				</Typography>
			</Box>

			{/* Order Info */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Container #
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: "bold" }}>
								{containerNumState || "N/A"}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Seal #
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: "bold" }}>
								{sealNumState || "N/A"}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Status
							</Typography>
							<Typography variant="body2" sx={{ fontWeight: "bold" }}>
								{orderStatus}
							</Typography>
						</Box>
					</Box>
				</CardContent>
			</Card>

			{/* Discrepancy Alert */}
			{hasDiscrepancies && (
				<Alert severity="warning" sx={{ mb: 3 }}>
					⚠️ {summaryRows.filter((r) => r.hasDiscrepancy).length} item(s) have quantity discrepancies. Please review and
					confirm before proceeding.
				</Alert>
			)}

			{/* Summary Table */}
			<TableContainer component={Paper} sx={{ mb: 3 }}>
				<Table>
					<TableHead>
						<TableRow sx={{ backgroundColor: "#f5f5f5" }}>
							<TableCell>Item ID</TableCell>
							<TableCell>Description</TableCell>
							<TableCell align="right">Expected Qty</TableCell>
							<TableCell align="right">Received Qty</TableCell>
							<TableCell align="right">Difference</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{summaryRows.map((row) => (
							<TableRow
								key={row.lineId}
								sx={{
									backgroundColor: row.hasDiscrepancy
										? row.difference > 0
											? "rgba(255, 193, 7, 0.1)"
											: "rgba(244, 67, 54, 0.1)"
										: "white",
								}}
							>
								<TableCell>{row.itemId}</TableCell>
								<TableCell>{row.description}</TableCell>
								<TableCell align="right">{row.expectedQty}</TableCell>
								<TableCell align="right">{row.receivedQty}</TableCell>
								<TableCell
									align="right"
									sx={{
										color: row.hasDiscrepancy ? (row.difference > 0 ? "#ff9800" : "#f44336") : "inherit",
										fontWeight: row.hasDiscrepancy ? "bold" : "normal",
									}}
								>
									{row.difference > 0 ? "+" : ""}
									{row.difference}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Summary Statistics */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Total Expected
							</Typography>
							<Typography variant="h6">{totalExpected}</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Total Received
							</Typography>
							<Typography variant="h6">{totalReceived}</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="textSecondary">
								Total Difference
							</Typography>
							<Typography
								variant="h6"
								sx={{
									color: totalDifference === 0 ? "green" : totalDifference > 0 ? "#ff9800" : "#f44336",
								}}
							>
								{totalDifference > 0 ? "+" : ""}
								{totalDifference}
							</Typography>
						</Box>
					</Box>
				</CardContent>
			</Card>

			{/* Confirm & Proceed Button - Top */}
			{!isConfirmed && (
				<Box sx={{ mb: 3 }}>
					<Button
						variant="contained"
						color="primary"
						size="large"
						onClick={handleConfirmFinalCounts}
						disabled={isSubmitting}
						sx={{ width: "100%" }}
					>
						{isSubmitting ? "Confirming..." : "Confirm & Proceed"}
					</Button>
				</Box>
			)}

			{/* File Upload Section - Only shows after confirmation */}
			{isConfirmed && (
				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography variant="h6" sx={{ mb: 2 }}>
							Upload Receiving Form
						</Typography>
						{uploadedFile ? (
							<Box>
								<Typography variant="body2" sx={{ mb: 2, color: "green", fontWeight: "bold" }}>
									✅ File uploaded: {uploadedFile.name}
								</Typography>
								<Button variant="outlined" color="error" size="small" onClick={() => setUploadedFile(null)}>
									Remove
								</Button>
							</Box>
						) : (
							<Box>
								<input
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									onChange={(e) => {
										if (e.target.files?.[0]) {
											handleFileUpload(e.target.files[0]);
										}
									}}
									style={{ display: "none" }}
									id="file-upload"
								/>
								<label htmlFor="file-upload">
									<Button variant="contained" component="span" disabled={isUploading}>
										{isUploading ? "Uploading..." : "Upload Form"}
									</Button>
								</label>
							</Box>
						)}
					</CardContent>
				</Card>
			)}

			{/* Send Email Button - Only shows after form upload */}
			{isConfirmed && uploadedFile && (
				<Box sx={{ display: "flex", gap: 2 }}>
					<Button variant="outlined" onClick={() => setShowOrderList(true)}>
						Back to Orders
					</Button>
					<Button variant="contained" color="success" size="large" onClick={handleSendEmail} disabled={isSendingEmail}>
						{isSendingEmail ? "Sending..." : "Send 'Cargo Received' Email"}
					</Button>
				</Box>
			)}
		</Box>
	);
}
