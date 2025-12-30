/* eslint-disable unicorn/filename-case */
/**
 * Screen 13: Shipping Summary & Docs (Phase 1 Spec)
 *
 * Customer Service user reviews manifest and uploads documentation.
 * Displays loaded items with real pallet data.
 * Allows download of loading summary CSV and upload of signed form + photos.
 *
 * Phase 1 Spec - Exact Requirements:
 * 1. Header: Manifest Ref, Type, Container #, Seal #, Status
 * 2. Loaded Items Table: Item ID, Description, Qty (from loaded pallets)
 * 3. Download Loading Summary CSV button
 * 4. Upload Signed Customer Form (mandatory)
 * 5. Upload Loading Photos (optional)
 * 6. Close Manifest & Send Email button
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
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";

import { manifests, pallets, products, shippingOrders, storage } from "../../lib/api/wms-api";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/auth/supabase-client";
import type { Manifest, ShippingOrder } from "../../types/domain";
import { sendShippingEmail } from "../../utils/shipping-email";

interface LoadedItem {
	itemId: string;
	description: string;
	qtyLoaded: number;
	palletCount: number;
}

export default function Screen13() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const { user } = useAuth();

	const { shippingOrderId, manifestId } = location.state || {};

	// State
	const [completedOrders, setCompletedOrders] = useState<ShippingOrder[]>([]);
	const [loadingOrders, setLoadingOrders] = useState(false);
	const [showOrderList, setShowOrderList] = useState(!shippingOrderId);
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(shippingOrderId || null);

	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [shippingOrder, setShippingOrder] = useState<ShippingOrder | null>(null);
	const [manifest, setManifest] = useState<Manifest | null>(null);
	const [loadedItems, setLoadedItems] = useState<LoadedItem[]>([]);
	const [formFile, setFormFile] = useState<File | null>(null);
	const [photoFiles, setPhotoFiles] = useState<File[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isFinalized, setIsFinalized] = useState(false);

	// Check authentication
	useEffect(() => {
		if (!user) {
			enqueueSnackbar("❌ You must be logged in to access this screen", { variant: "error" });
			navigate("/auth/login");
		}
	}, [user, navigate, enqueueSnackbar]);

	// Load completed orders
	useEffect(() => {
		if (showOrderList) {
			const loadCompletedOrders = async () => {
				try {
					setLoadingOrders(true);
					const orders = await shippingOrders.getAll();
					const completed = orders.filter((o: ShippingOrder) => o.status === "Completed");
					const sorted = completed.sort((a, b) => {
						const dateA = new Date(a.created_at).getTime();
						const dateB = new Date(b.created_at).getTime();
						return dateB - dateA;
					});
					setCompletedOrders(sorted);
					if (sorted.length === 0) {
						enqueueSnackbar("No completed shipping orders available", { variant: "info" });
					}
				} catch {
					enqueueSnackbar("Failed to load orders", { variant: "error" });
				} finally {
					setLoadingOrders(false);
				}
			};
			loadCompletedOrders();
		}
	}, [showOrderList, enqueueSnackbar]);

	// Load shipping order and loaded items
	useEffect(() => {
		const loadData = async () => {
			const orderId = selectedOrderId || shippingOrderId;
			if (!orderId) return;

			try {
				setIsLoading(true);
				setError(null);

				// Fetch shipping order
				const order = await shippingOrders.getById(orderId);

				if (order.status !== "Completed") {
					enqueueSnackbar("Shipping order is not in Completed status", { variant: "error" });
					navigate("/warehouse/home");
					return;
				}

				setShippingOrder(order);

				// Fetch manifest data to get container and seal numbers
				let manifestData: Manifest | null = null;
				if (manifestId) {
					try {
						manifestData = await manifests.getById(manifestId);
						setManifest(manifestData);
					} catch (error_) {
						console.warn("Failed to fetch manifest:", error_);
					}
				} else {
					// Try to find manifest by shipping order
					try {
						const allManifests = await manifests.getFiltered({});
						// Find manifest that contains this shipping order's pallets
						for (const mani of allManifests) {
							const { data: manifestPallets } = await supabase
								.from("pallets")
								.select("*")
								.eq("manifest_id", mani.id)
								.eq("shipping_order_id", orderId);
							if (manifestPallets && manifestPallets.length > 0) {
								manifestData = mani;
								setManifest(mani);
								break;
							}
						}
					} catch (error_) {
						console.warn("Failed to find manifest:", error_);
					}
				}

				// Fetch loaded pallets using direct Supabase query

				const { data: loadedPalletsData, error: palletsError } = await supabase
					.from("pallets")
					.select("*")
					.eq("shipping_order_id", orderId)
					.eq("status", "Loaded");
				const loadedPallets = loadedPalletsData || [];
				if (palletsError) {
					console.error("❌ [SCREEN 13] Error fetching loaded pallets:", palletsError);
				}

				// Calculate loaded items (group by product, sum quantities, count pallets)
				const itemMap = new Map<string, { description: string; totalQty: number; palletCount: number }>();

				for (const pallet of loadedPallets) {
					try {
						const product = await products.getByItemId(pallet.item_id);
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
					} catch (error_) {
						console.error(`Failed to load product ${pallet.item_id}:`, error_);
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
				const message = error_ instanceof Error ? error_.message : "Failed to load data";
				setError(message);
				enqueueSnackbar(message, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [selectedOrderId, shippingOrderId, manifestId, navigate, enqueueSnackbar]);

	// Handle order selection
	const handleSelectOrder = (orderId: string) => {
		setSelectedOrderId(orderId);
		setShowOrderList(false);
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
		if (!shippingOrder || loadedItems.length === 0) return;

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

			const csvContent = [
				`Manifest Ref: ${shippingOrder.seal_num || "AUTO-GENERATED"}`,
				`Type: ${shippingOrder.shipment_type === "Hand_Delivery" ? "Hand Delivery" : "Container Loading"}`,
				`Order Ref: ${shippingOrder.order_ref}`,
				`Generated: ${new Date().toLocaleString()}`,
				"",
				headers.join(","),
				...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
			].join("\n");

			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", `loading-summary-${shippingOrder.order_ref}.csv`);
			link.style.visibility = "hidden";
			document.body.append(link);
			link.click();
			link.remove();

			enqueueSnackbar("✅ Loading summary downloaded", { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to download";
			enqueueSnackbar(message, { variant: "error" });
		}
	};

	// Close manifest and send email
	const handleCloseManifest = async () => {
		if (!shippingOrder || !formFile) {
			enqueueSnackbar("❌ Please upload the signed customer form before closing manifest", { variant: "error" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Upload form file
			const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
			// Sanitize filename to remove spaces and special characters that cause upload errors
			const sanitizedFormName = formFile.name
				.replaceAll(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars with underscores
				.replaceAll(/_{2,}/g, "_") // Replace multiple underscores with single
				.toLowerCase(); // Convert to lowercase for consistency
			const formPath = `shipping/${shippingOrder.id}/form_${timestamp}_${sanitizedFormName}`;
			await storage.upload("shipping", formPath, formFile);

			// Upload photos if provided
			const photoUrls: string[] = [];
			if (photoFiles.length > 0) {
				for (const [i, photo] of photoFiles.entries()) {
					const photoTimestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
					const photoPath = `shipping/${shippingOrder.id}/photo_${photoTimestamp}_${i}.jpg`;
					await storage.upload("shipping", photoPath, photo);
					photoUrls.push(photoPath);
				}
			}

			// Send email
			const emailData = {
				shippingOrderId: shippingOrder.id,
				orderRef: shippingOrder.order_ref,
				shipmentType: shippingOrder.shipment_type,
				items: loadedItems.map((item) => ({
					itemId: item.itemId,
					description: item.description,
					qtyShipped: item.qtyLoaded,
				})),
				containerNum: shippingOrder.shipment_type === "Container_Loading" ? "TBD" : undefined,
				sealNum: shippingOrder.seal_num,
				formUrl: formPath,
				photoUrls,
			};

			await sendShippingEmail(emailData);

			// Update shipping order status
			await shippingOrders.update(shippingOrder.id, {
				status: "Shipped",
			});

			// Update all loaded pallets to Shipped
			const loadedPallets = await pallets.getFiltered({
				shipping_order_id: shippingOrder.id,
				status: "Loaded",
			});

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

			// Navigate to home after 2 seconds
			setTimeout(() => {
				navigate("/warehouse/home");
			}, 2000);
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to close manifest";
			enqueueSnackbar(`❌ ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Show order list
	if (showOrderList) {
		if (loadingOrders) {
			return (
				<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
					<CircularProgress />
				</Box>
			);
		}

		return (
			<Box sx={{ p: 3 }}>
				<Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
					Select Completed Shipping Order
				</Typography>

				{completedOrders.length === 0 ? (
					<Alert severity="info">No completed shipping orders available</Alert>
				) : (
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr", lg: "1fr 1fr 1fr 1fr" },
							gap: 2,
						}}
					>
						{completedOrders.map((order) => (
							<Card
								key={order.id}
								onClick={() => handleSelectOrder(order.id)}
								sx={{
									cursor: "pointer",
									"&:hover": { boxShadow: 3 },
									transition: "all 0.2s",
								}}
							>
								<CardContent>
									<Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
										{order.order_ref}
									</Typography>
									<Typography color="textSecondary" variant="body2" sx={{ mb: 1 }}>
										Type: {order.shipment_type === "Hand_Delivery" ? "Hand Delivery" : "Container"}
									</Typography>
									<Typography color="textSecondary" variant="body2">
										Created: {new Date(order.created_at).toLocaleDateString()}
									</Typography>
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

	if (error || !shippingOrder) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">{error || "Failed to load shipping order"}</Alert>
				<Button startIcon={<ArrowLeftIcon />} onClick={() => navigate("/warehouse/home")} sx={{ mt: 2 }}>
					Back to Home
				</Button>
			</Box>
		);
	}

	const totalQtyLoaded = loadedItems.reduce((sum, item) => sum + item.qtyLoaded, 0);
	const manifestRef = shippingOrder.seal_num || `AUTO-${shippingOrder.id.slice(0, 8)}`;

	return (
		<Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
			{/* Header */}
			<Box sx={{ mb: 4 }}>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
					<Typography variant="h4" sx={{ fontWeight: 700 }}>
						📦 Shipping Summary & Docs
					</Typography>
					<Button startIcon={<ArrowLeftIcon />} onClick={() => navigate("/warehouse/home")} variant="outlined">
						Back
					</Button>
				</Box>
			</Box>

			{/* Manifest Info Card */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
						<Box>
							<Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
								Manifest Ref / Trip ID
							</Typography>
							<Typography variant="h6" sx={{ fontWeight: 600 }}>
								{manifestRef}
							</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
								Type
							</Typography>
							<Chip
								label={shippingOrder.shipment_type === "Hand_Delivery" ? "Hand Delivery" : "Container"}
								color={shippingOrder.shipment_type === "Hand_Delivery" ? "primary" : "secondary"}
								variant="outlined"
							/>
						</Box>
						{manifest && manifest.container_num && (
							<Box>
								<Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
									Container #
								</Typography>
								<Typography variant="h6" sx={{ fontWeight: 600 }}>
									{manifest.container_num}
								</Typography>
							</Box>
						)}
						{manifest && manifest.seal_num && (
							<Box>
								<Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
									Seal #
								</Typography>
								<Typography variant="h6" sx={{ fontWeight: 600 }}>
									{manifest.seal_num}
								</Typography>
							</Box>
						)}
						{shippingOrder.seal_num && !manifest?.seal_num && (
							<Box>
								<Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
									Seal #
								</Typography>
								<Typography variant="h6" sx={{ fontWeight: 600 }}>
									{shippingOrder.seal_num}
								</Typography>
							</Box>
						)}
						<Box>
							<Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
								Status
							</Typography>
							<Chip label="Open" color="warning" variant="outlined" />
						</Box>
						<Box>
							<Typography color="textSecondary" variant="body2" sx={{ mb: 0.5 }}>
								Order Ref
							</Typography>
							<Typography variant="h6">{shippingOrder.order_ref}</Typography>
						</Box>
					</Box>
				</CardContent>
			</Card>

			{/* Loaded Items Table */}
			<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
				Loaded Items
			</Typography>

			{loadedItems.length === 0 ? (
				<Alert severity="info" sx={{ mb: 3 }}>
					No items loaded in this shipment
				</Alert>
			) : (
				<TableContainer component={Paper} sx={{ mb: 3 }}>
					<Table>
						<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
							<TableRow>
								<TableCell sx={{ fontWeight: 600 }}>Item ID</TableCell>
								<TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
								<TableCell align="right" sx={{ fontWeight: 600 }}>
									Qty Loaded
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loadedItems.map((item) => (
								<TableRow key={item.itemId} hover>
									<TableCell sx={{ fontWeight: 500 }}>{item.itemId}</TableCell>
									<TableCell>{item.description}</TableCell>
									<TableCell align="right">{item.qtyLoaded}</TableCell>
								</TableRow>
							))}
							<TableRow sx={{ backgroundColor: "#f9f9f9", fontWeight: 600 }}>
								<TableCell colSpan={2} sx={{ fontWeight: 600 }}>
									TOTAL
								</TableCell>
								<TableCell align="right" sx={{ fontWeight: 600 }}>
									{totalQtyLoaded}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</TableContainer>
			)}

			{/* Download CSV Button */}
			<Box sx={{ mb: 3 }}>
				<Button
					variant="contained"
					startIcon={<DownloadIcon />}
					onClick={handleDownloadSummary}
					disabled={isSubmitting || loadedItems.length === 0 || isFinalized}
					sx={{ mb: 2 }}
				>
					📥 Download Loading Summary CSV
				</Button>
				<Typography variant="body2" color="textSecondary">
					Use this CSV for paperwork and customer documentation
				</Typography>
			</Box>

			{/* Upload Signed Customer Form */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
						Upload Signed Customer Form <span style={{ color: "red" }}>*</span> (Mandatory)
					</Typography>

					<Box sx={{ mb: 2 }}>
						<TextField
							type="file"
							inputProps={{ accept: ".pdf,.jpg,.jpeg,.png" }}
							onChange={handleFormFileChange}
							fullWidth
							disabled={isSubmitting || isFinalized}
						/>
						{formFile && (
							<Typography variant="body2" sx={{ mt: 1, color: "success.main", fontWeight: 600 }}>
								✓ {formFile.name} selected
							</Typography>
						)}
					</Box>

					<Alert severity="info">
						Upload the signed delivery note / BOL (PDF or image). Maximum file size: 10MB. Required before closing
						manifest.
					</Alert>
				</CardContent>
			</Card>

			{/* Upload Loading Photos */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
						Upload Loading Photos (Optional)
					</Typography>

					<Box sx={{ mb: 2 }}>
						<TextField
							type="file"
							inputProps={{ accept: ".jpg,.jpeg,.png", multiple: true }}
							onChange={handlePhotoFileChange}
							fullWidth
							disabled={isSubmitting || isFinalized}
						/>
					</Box>

					{photoFiles.length > 0 && (
						<Box sx={{ mb: 2 }}>
							<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
								Selected Photos ({photoFiles.length}):
							</Typography>
							{photoFiles.map((photo, index) => (
								<Box
									key={index}
									sx={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										p: 1,
										mb: 1,
										backgroundColor: "#f5f5f5",
										borderRadius: 1,
									}}
								>
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

					<Alert severity="info">
						Upload photos of loaded truck, seal, etc. (JPEG or PNG). Maximum 10MB per file. Optional but recommended.
					</Alert>
				</CardContent>
			</Card>

			{/* Finalization Status */}
			{isFinalized && (
				<Alert severity="success" sx={{ mb: 3 }}>
					✅ Manifest closed! All pallets marked as shipped. Email sent to customer. Navigating to home...
				</Alert>
			)}

			{/* Close Manifest Button */}
			<Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
				<Button
					variant="contained"
					color="success"
					size="large"
					startIcon={<CheckCircleIcon />}
					onClick={handleCloseManifest}
					disabled={isSubmitting || !formFile || isFinalized}
					sx={{ minWidth: 250 }}
				>
					{isSubmitting ? <CircularProgress size={24} /> : "✓ Close Manifest & Send Email"}
				</Button>
			</Box>
		</Box>
	);
}
