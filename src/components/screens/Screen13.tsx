/* eslint-disable unicorn/filename-case */
/**
 * Screen 13: Manifests (Grid View)
 *
 * Customer Service user views all manifests (trucks/trips) in a data grid.
 * Shows ALL manifests including Open ones to enable finalization.
 * Each row represents one Manifest (truck/trip), not an Order.
 *
 * Columns:
 * - Manifest Ref (ID or seal number)
 * - Type (Hand / Container)
 * - Status (Open / Closed)
 * - Total Pallets (count of loaded pallets)
 * - Actions (View Details button)
 */

import React, { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
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
import { DownloadIcon } from "@phosphor-icons/react/dist/ssr/Download";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

import { manifests, pallets, products, storage } from "../../lib/api/wms-api";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/auth/supabase-client";
import type { Manifest, Product } from "../../types/domain";
import { sendShippingEmail } from "../../utils/shipping-email";

interface ManifestRow {
	id: string;
	manifestRef: string;
	type: "Hand" | "Container";
	status: "Open" | "Closed" | "Cancelled";
	totalPallets: number;
	containerNum?: string;
	sealNum?: string;
}

interface LoadedItem {
	itemId: string;
	description: string;
	qtyLoaded: number;
	palletCount: number;
}

// Helper function to check if manifest is Hand Delivery
const isHandDelivery = (type: string): boolean => {
	return type === "Hand";
};

export default function Screen13() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const { user } = useAuth();

	// State - Grid view
	const [manifestRows, setManifestRows] = useState<ManifestRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// State - Detail view
	const [selectedManifestId, setSelectedManifestId] = useState<string | null>(null);
	const [manifestDetail, setManifestDetail] = useState<Manifest | null>(null);
	const [loadedItems, setLoadedItems] = useState<LoadedItem[]>([]);
	const [isLoadingDetail, setIsLoadingDetail] = useState(false);
	const [formFile, setFormFile] = useState<File | null>(null);
	const [photoFiles, setPhotoFiles] = useState<File[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isFinalized, setIsFinalized] = useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);

	// Check authentication
	useEffect(() => {
		if (!user) {
			enqueueSnackbar("❌ You must be logged in to access this screen", { variant: "error" });
			navigate("/auth/login");
		}
	}, [user, navigate, enqueueSnackbar]);

	// Load all manifests with pallet counts
	useEffect(() => {
		const loadManifests = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Fetch all manifests
				const allManifests = await manifests.getAll();

				// For each manifest, count loaded pallets
				const manifestRowsData: ManifestRow[] = [];

				for (const manifest of allManifests) {
					// Count pallets for this manifest
					const { data: palletData, error: palletError } = await supabase
						.from("pallets")
						.select("id", { count: "exact" })
						.eq("manifest_id", manifest.id)
						.in("status", ["Loaded", "Shipped"]);

					if (palletError) {
						console.error(`Error counting pallets for manifest ${manifest.id}:`, palletError);
						continue;
					}

					const totalPallets = palletData?.length || 0;

					// Create manifest ref (use seal_num or first 8 chars of ID)
					const manifestRef = manifest.seal_num || manifest.id.slice(0, 8).toUpperCase();

					manifestRowsData.push({
						id: manifest.id,
						manifestRef,
						type: manifest.type,
						status: manifest.status,
						totalPallets,
						containerNum: manifest.container_num || undefined,
						sealNum: manifest.seal_num || undefined,
					});
				}

				// Sort by status (Open first, then Closed, then Cancelled) and creation date
				manifestRowsData.sort((a, b) => {
					// Status priority: Open > Closed > Cancelled
					const statusOrder = { Open: 0, Closed: 1, Cancelled: 2 };
					const statusDiff = statusOrder[a.status] - statusOrder[b.status];
					if (statusDiff !== 0) return statusDiff;

					// Within same status, sort by ID (newest first)
					return b.id.localeCompare(a.id);
				});

				setManifestRows(manifestRowsData);
			} catch (error_) {
				const message = error_ instanceof Error ? error_.message : "Failed to load manifests";
				setError(message);
				enqueueSnackbar(message, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadManifests();
	}, [enqueueSnackbar]);

	// Load manifest details
	const loadManifestDetails = async (manifestId: string) => {
		try {
			setIsLoadingDetail(true);
			setError(null);

			// Fetch manifest
			const manifest = await manifests.getById(manifestId);
			setManifestDetail(manifest);

			// Fetch loaded pallets
			const { data: loadedPalletsData } = await supabase
				.from("pallets")
				.select("*")
				.eq("manifest_id", manifestId)
				.in("status", ["Loaded", "Shipped"]);

			const loadedPallets = loadedPalletsData || [];

			// Calculate loaded items (group by product)
			const itemMap = new Map<string, { description: string; totalQty: number; palletCount: number }>();

			// Batch fetch products
			const uniqueItemIds = [...new Set(loadedPallets.map((p) => p.item_id))];
			const productPromises = uniqueItemIds.map((itemId) => products.getByItemId(itemId).catch(() => null));
			const productResults = await Promise.all(productPromises);

			// Create product lookup map
			const productMap = new Map<string, Product | null>();
			for (const [index, product] of productResults.entries()) {
				if (product) {
					productMap.set(uniqueItemIds[index], product);
				}
			}

			// Process pallets
			for (const pallet of loadedPallets) {
				const product = productMap.get(pallet.item_id);
				if (!product) continue;

				const existing = itemMap.get(pallet.item_id);
				if (existing) {
					existing.totalQty += pallet.qty;
					existing.palletCount += 1;
				} else {
					itemMap.set(pallet.item_id, {
						description: product.description,
						totalQty: pallet.qty,
						palletCount: 1,
					});
				}
			}

			// Convert to loaded items array
			const items: LoadedItem[] = [...itemMap.entries()].map(([itemId, data]) => ({
				itemId,
				description: data.description,
				qtyLoaded: data.totalQty,
				palletCount: data.palletCount,
			}));

			setLoadedItems(items);
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to load manifest details";
			setError(message);
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsLoadingDetail(false);
		}
	};

	// Handle view details
	const handleViewDetails = async (manifestId: string) => {
		setSelectedManifestId(manifestId);
		await loadManifestDetails(manifestId);
	};

	// Handle back to grid
	const handleBackToGrid = () => {
		setSelectedManifestId(null);
		setManifestDetail(null);
		setLoadedItems([]);
		setFormFile(null);
		setPhotoFiles([]);
		setIsFinalized(false);
		setError(null);
	};

	// Handle form file change
	const handleFormFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const validTypes = ["application/pdf", "image/jpeg", "image/png"];
			if (!validTypes.includes(file.type)) {
				enqueueSnackbar("Invalid file type. Please upload PDF, JPEG, or PNG.", { variant: "error" });
				return;
			}
			if (file.size > 10 * 1024 * 1024) {
				enqueueSnackbar("File is too large. Maximum size is 10MB.", { variant: "error" });
				return;
			}
			setFormFile(file);
		}
	};

	// Handle photo file change
	const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files) {
			const newPhotos: File[] = [];
			for (const file of files) {
				const validTypes = ["image/jpeg", "image/png"];
				if (!validTypes.includes(file.type)) {
					enqueueSnackbar(`Invalid file type for ${file.name}. Please upload JPEG or PNG.`, {
						variant: "error",
					});
					continue;
				}
				if (file.size > 10 * 1024 * 1024) {
					enqueueSnackbar(`${file.name} is too large. Maximum size is 10MB.`, { variant: "error" });
					continue;
				}
				newPhotos.push(file);
			}
			setPhotoFiles((prev) => [...prev, ...newPhotos]);
		}
	};

	// Remove photo
	const handleRemovePhoto = (index: number) => {
		setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
	};

	// Download loading summary CSV
	const handleDownloadSummary = () => {
		if (!manifestDetail || loadedItems.length === 0) return;

		try {
			const headers = ["Item ID", "Description", "Qty Loaded", "Pallets"];
			const rows = loadedItems.map((item) => [
				item.itemId,
				item.description,
				item.qtyLoaded.toString(),
				item.palletCount.toString(),
			]);

			const totalQty = loadedItems.reduce((sum, item) => sum + item.qtyLoaded, 0);
			const totalPallets = loadedItems.reduce((sum, item) => sum + item.palletCount, 0);
			rows.push(["", "TOTAL", totalQty.toString(), totalPallets.toString()]);

			const manifestRef = manifestDetail.seal_num || manifestDetail.id.slice(0, 8).toUpperCase();
			const csvContent = [
				`Manifest Ref: ${manifestRef}`,
				`Type: ${isHandDelivery(manifestDetail.type) ? "Hand Delivery" : "Container"}`,
				`Generated: ${new Date().toLocaleString()}`,
				"",
				headers.join(","),
				...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
			].join("\n");

			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", `manifest-${manifestRef}.csv`);
			link.style.visibility = "hidden";
			document.body.append(link);
			link.click();
			link.remove();

			enqueueSnackbar("✅ Manifest summary downloaded", { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to download";
			enqueueSnackbar(message, { variant: "error" });
		}
	};

	// Close manifest and send email
	const handleCloseManifest = async () => {
		if (!manifestDetail || !formFile) {
			enqueueSnackbar("❌ Please upload the signed customer form before closing manifest", {
				variant: "error",
			});
			return;
		}

		try {
			setIsSubmitting(true);

			// Upload form file
			const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
			const sanitizedFormName = formFile.name
				.replaceAll(/[^a-zA-Z0-9.-]/g, "_")
				.replaceAll(/_{2,}/g, "_")
				.toLowerCase();
			const formPath = `manifests/${manifestDetail.id}/form_${timestamp}_${sanitizedFormName}`;
			await storage.upload("shipping", formPath, formFile);

			// Upload photos if provided
			const photoUrls: string[] = [];
			if (photoFiles.length > 0) {
				for (const [i, photo] of photoFiles.entries()) {
					const photoTimestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
					const photoPath = `manifests/${manifestDetail.id}/photo_${photoTimestamp}_${i}.jpg`;
					await storage.upload("shipping", photoPath, photo);
					photoUrls.push(photoPath);
				}
			}

			// Send email
			const manifestRef = manifestDetail.seal_num || manifestDetail.id.slice(0, 8).toUpperCase();
			const shipmentType: "Hand_Delivery" | "Container_Loading" = isHandDelivery(manifestDetail.type)
				? "Hand_Delivery"
				: "Container_Loading";
			const emailData = {
				shippingOrderId: manifestDetail.id,
				orderRef: manifestRef,
				shipmentType,
				items: loadedItems.map((item) => ({
					itemId: item.itemId,
					description: item.description,
					qtyShipped: item.qtyLoaded,
				})),
				containerNum: manifestDetail.container_num,
				sealNum: manifestDetail.seal_num,
				formUrl: formPath,
				photoUrls,
			};

			await sendShippingEmail(emailData);

			// Update manifest status to Closed
			await manifests.update(manifestDetail.id, { status: "Closed" });

			// Update all loaded pallets to Shipped - query directly via supabase
			const { data: loadedPalletsData } = await supabase
				.from("pallets")
				.select("*")
				.eq("manifest_id", manifestDetail.id)
				.eq("status", "Loaded");

			const loadedPallets = loadedPalletsData || [];
			const now = new Date().toISOString();
			for (const pallet of loadedPallets) {
				await pallets.update(pallet.id, {
					status: "Shipped",
					shipped_at: now,
				});
			}

			setIsFinalized(true);
			enqueueSnackbar("✅ Manifest closed! All pallets marked as shipped. Email sent to customer.", {
				variant: "success",
			});

			// Navigate back to grid after 2 seconds
			setTimeout(() => {
				handleBackToGrid();
				// Reload manifests
				globalThis.location.reload();
			}, 2000);
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to close manifest";
			enqueueSnackbar(`❌ ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Cancel manifest
	const handleCancelManifest = async () => {
		if (!manifestDetail) return;

		try {
			setIsCancelling(true);

			// Update manifest status to Cancelled
			await manifests.update(manifestDetail.id, { status: "Cancelled" });

			// FIRST: Get all shipping orders that have pallets in this manifest BEFORE updating pallets
			const { data: palletsInManifest } = await supabase
				.from("pallets")
				.select("shipping_order_id")
				.eq("manifest_id", manifestDetail.id)
				.not("shipping_order_id", "is", null);

			// THEN: Reset all loaded pallets to Staged status
			const { error: palletsError } = await supabase
				.from("pallets")
				.update({ status: "Staged", manifest_id: null })
				.eq("manifest_id", manifestDetail.id)
				.eq("status", "Loaded");

			if (palletsError) throw palletsError;

			// FINALLY: Update shipping orders back to "Loading" status
			if (palletsInManifest && palletsInManifest.length > 0) {
				// Get unique shipping order IDs
				const uniqueOrderIds = [...new Set(palletsInManifest.map((p) => p.shipping_order_id))];

				// Update each shipping order back to "Loading" status
				for (const orderId of uniqueOrderIds) {
					await supabase.from("shipping_orders").update({ status: "Loading" }).eq("id", orderId);
				}
			}

			enqueueSnackbar(
				"✅ Manifest cancelled successfully! Pallets reset to Staged and shipping order set back to Loading.",
				{
					variant: "success",
				}
			);

			setCancelDialogOpen(false);
			setTimeout(() => {
				handleBackToGrid();
				globalThis.location.reload();
			}, 1500);
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to cancel manifest";
			enqueueSnackbar(`❌ ${message}`, { variant: "error" });
		} finally {
			setIsCancelling(false);
		}
	};

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">{error}</Alert>
			</Box>
		);
	}

	// Show detail view if manifest is selected
	if (selectedManifestId && manifestDetail) {
		const manifestRef = manifestDetail.seal_num || manifestDetail.id.slice(0, 8).toUpperCase();

		return (
			<Box sx={{ p: 3 }}>
				{/* Back Button */}
				<Button startIcon={<ArrowLeftIcon />} onClick={handleBackToGrid} sx={{ mb: 3 }}>
					Back to Manifests
				</Button>

				{/* Loading Detail */}
				{isLoadingDetail && (
					<Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
						<CircularProgress />
					</Box>
				)}

				{/* Detail View */}
				{!isLoadingDetail && (
					<>
						{/* Header */}
						<Box sx={{ mb: 4 }}>
							<Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
								📦 Manifest Details: {manifestRef}
							</Typography>
							<Box sx={{ display: "flex", gap: 2, mt: 2 }}>
								<Chip
									label={isHandDelivery(manifestDetail.type) ? "Hand Delivery" : "Container"}
									color={isHandDelivery(manifestDetail.type) ? "primary" : "secondary"}
									variant="outlined"
								/>
								<Chip
									label={manifestDetail.status}
									color={
										manifestDetail.status === "Open"
											? "warning"
											: manifestDetail.status === "Closed"
												? "success"
												: "default"
									}
								/>
								{!isHandDelivery(manifestDetail.type) && manifestDetail.container_num && (
									<Chip label={`Container: ${manifestDetail.container_num}`} variant="outlined" />
								)}
								<Chip label={`Seal: ${manifestDetail.seal_num}`} variant="outlined" />
							</Box>
						</Box>

						{/* Loaded Items Table */}
						<Card sx={{ mb: 3 }}>
							<CardContent>
								<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
									<Typography variant="h6" sx={{ fontWeight: 600 }}>
										Loaded Items
									</Typography>
									<Button
										startIcon={<DownloadIcon />}
										onClick={handleDownloadSummary}
										disabled={loadedItems.length === 0}
									>
										Download CSV
									</Button>
								</Box>

								{loadedItems.length === 0 ? (
									<Alert severity="info">No items loaded in this manifest</Alert>
								) : (
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell sx={{ fontWeight: 600 }}>Item ID</TableCell>
													<TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														Qty Loaded
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														Pallets
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{loadedItems.map((item) => (
													<TableRow key={item.itemId}>
														<TableCell>{item.itemId}</TableCell>
														<TableCell>{item.description}</TableCell>
														<TableCell align="right">{item.qtyLoaded}</TableCell>
														<TableCell align="right">{item.palletCount}</TableCell>
													</TableRow>
												))}
												<TableRow sx={{ backgroundColor: "#f5f5f5" }}>
													<TableCell colSpan={2} sx={{ fontWeight: 600 }}>
														TOTAL
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														{loadedItems.reduce((sum, item) => sum + item.qtyLoaded, 0)}
													</TableCell>
													<TableCell align="right" sx={{ fontWeight: 600 }}>
														{loadedItems.reduce((sum, item) => sum + item.palletCount, 0)}
													</TableCell>
												</TableRow>
											</TableBody>
										</Table>
									</TableContainer>
								)}
							</CardContent>
						</Card>

						{/* Upload Signed Customer Form */}
						{manifestDetail.status === "Open" && (
							<Card sx={{ mb: 3 }}>
								<CardContent>
									<Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
										Upload Signed Customer Form
									</Typography>
									<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
										Upload the signed delivery note or shipping form (PDF, JPEG, or PNG)
									</Typography>
									<TextField
										type="file"
										fullWidth
										inputProps={{ accept: "application/pdf,image/jpeg,image/png" }}
										onChange={handleFormFileChange}
										disabled={isSubmitting || isFinalized}
									/>
									{formFile && (
										<Typography variant="body2" sx={{ mt: 1, color: "success.main" }}>
											✓ {formFile.name} selected
										</Typography>
									)}
								</CardContent>
							</Card>
						)}

						{/* Upload Loading Photos (Optional) */}
						{manifestDetail.status === "Open" && (
							<Card sx={{ mb: 3 }}>
								<CardContent>
									<Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
										Upload Loading Photos (Optional)
									</Typography>
									<TextField
										type="file"
										fullWidth
										inputProps={{ accept: "image/jpeg,image/png", multiple: true }}
										onChange={handlePhotoFileChange}
										disabled={isSubmitting || isFinalized}
									/>
									{photoFiles.length > 0 && (
										<Box sx={{ mt: 2 }}>
											<Typography variant="body2" sx={{ mb: 1 }}>
												{photoFiles.length} photo(s) selected:
											</Typography>
											{photoFiles.map((photo, index) => (
												<Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
													<Typography variant="body2">{photo.name}</Typography>
													<Button
														size="small"
														color="error"
														onClick={() => handleRemovePhoto(index)}
														disabled={isSubmitting || isFinalized}
													>
														Remove
													</Button>
												</Box>
											))}
										</Box>
									)}
								</CardContent>
							</Card>
						)}

						{/* Finalization Message */}
						{isFinalized && (
							<Alert severity="success" sx={{ mb: 3 }}>
								✅ Manifest closed! All pallets marked as shipped. Email sent to customer. Navigating back...
							</Alert>
						)}

						{/* Action Buttons */}
						{manifestDetail.status === "Open" && (
							<Box sx={{ display: "flex", gap: 2 }}>
								<Button
									variant="contained"
									color="success"
									startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
									onClick={handleCloseManifest}
									disabled={isSubmitting || !formFile || isFinalized}
								>
									{isSubmitting ? "Closing..." : "Close Manifest & Send Email"}
								</Button>
								<Button
									variant="outlined"
									color="error"
									startIcon={<XCircleIcon />}
									onClick={() => setCancelDialogOpen(true)}
									disabled={isSubmitting || isCancelling || isFinalized}
								>
									Cancel Manifest
								</Button>
							</Box>
						)}

						{/* Closed/Cancelled Status */}
						{manifestDetail.status === "Closed" && (
							<Alert severity="success">This manifest has been closed and shipped.</Alert>
						)}
						{manifestDetail.status === "Cancelled" && (
							<Alert severity="warning">This manifest has been cancelled.</Alert>
						)}
					</>
				)}

				{/* Cancel Confirmation Dialog */}
				<Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
					<DialogTitle>Cancel Manifest?</DialogTitle>
					<DialogContent>
						<DialogContentText>
							Are you sure you want to cancel this manifest? This will:
							<ul>
								<li>Mark the manifest as Cancelled</li>
								<li>Reset all loaded pallets to Staged status</li>
								<li>Set shipping order status back to Loading</li>
								<li>Remove the manifest association from pallets</li>
							</ul>
							Pallets will be available for loading into a new container. This action cannot be undone.
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setCancelDialogOpen(false)} disabled={isCancelling}>
							No, Keep It
						</Button>
						<Button onClick={handleCancelManifest} color="error" disabled={isCancelling}>
							{isCancelling ? "Cancelling..." : "Yes, Cancel Manifest"}
						</Button>
					</DialogActions>
				</Dialog>
			</Box>
		);
	}

	// Show grid view
	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ mb: 4 }}>
				<Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
					🚛 Manifests
				</Typography>
				<Typography color="textSecondary" variant="body1">
					All manifests (trucks/trips) including Open ones. Each row represents one manifest.
				</Typography>
			</Box>

			{/* Manifests Table */}
			{manifestRows.length === 0 ? (
				<Alert severity="info">No manifests found. Create manifests on Screen 4 (Register Container).</Alert>
			) : (
				<TableContainer component={Paper}>
					<Table>
						<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
							<TableRow>
								<TableCell sx={{ fontWeight: 600 }}>Manifest Ref</TableCell>
								<TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
								<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
								<TableCell align="right" sx={{ fontWeight: 600 }}>
									Total Pallets
								</TableCell>
								<TableCell align="center" sx={{ fontWeight: 600 }}>
									Actions
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{manifestRows.map((row) => (
								<TableRow key={row.id} hover>
									<TableCell sx={{ fontWeight: 500 }}>{row.manifestRef}</TableCell>
									<TableCell>
										<Chip
											label={isHandDelivery(row.type) ? "Hand Delivery" : "Container"}
											color={isHandDelivery(row.type) ? "primary" : "secondary"}
											size="small"
											variant="outlined"
										/>
									</TableCell>
									<TableCell>
										<Chip
											label={row.status}
											color={row.status === "Open" ? "warning" : row.status === "Closed" ? "success" : "default"}
											size="small"
										/>
									</TableCell>
									<TableCell align="right">{row.totalPallets}</TableCell>
									<TableCell align="center">
										<Button
											variant="outlined"
											size="small"
											startIcon={<EyeIcon />}
											onClick={() => handleViewDetails(row.id)}
										>
											View
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			{/* Summary */}
			<Box sx={{ mt: 3, p: 2, backgroundColor: "#f9f9f9", borderRadius: 1 }}>
				<Typography variant="body2" color="textSecondary">
					<strong>Total Manifests:</strong> {manifestRows.length} | <strong>Open:</strong>{" "}
					{manifestRows.filter((r) => r.status === "Open").length} | <strong>Closed:</strong>{" "}
					{manifestRows.filter((r) => r.status === "Closed").length} | <strong>Cancelled:</strong>{" "}
					{manifestRows.filter((r) => r.status === "Cancelled").length}
				</Typography>
			</Box>
		</Box>
	);
}
