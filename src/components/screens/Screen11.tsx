/* eslint-disable unicorn/filename-case */
/**
 * Screen 11: Load Target Selection
 *
 * WH user selects where pallets will be loaded.
 * Branches by shipment_type:
 * - Hand Delivery: Show order ref, seal #, [Start Loading] button
 * - Container Loading: Show list of open container manifests to select from
 *
 * Story 7.1 Acceptance Criteria:
 * 1. Branch by shipment_type: Hand Delivery vs Container Loading
 * 4. On selection/click, navigate to Screen 12 (Load Pallets)
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
	Typography,
} from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { useSnackbar } from "notistack";
import { useLocation, useNavigate } from "react-router-dom";

import { manifests as manifestsApi, shippingOrders } from "../../lib/api/wms-api";
import { supabase } from "../../lib/auth/supabase-client";
import type { Manifest, ShippingOrder } from "../../types/domain";

export default function Screen11() {
	const location = useLocation();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();

	const { shippingOrderId } = location.state || {};

	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [shippingOrder, setShippingOrder] = useState<ShippingOrder | null>(null);
	const [manifests, setManifests] = useState<Manifest[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Load shipping order and manifests
	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoading(true);
				setError(null);

				if (!shippingOrderId) {
					enqueueSnackbar("No shipping order selected", { variant: "error" });
					navigate("/warehouse");
					return;
				}

				// Fetch shipping order
				const order = await shippingOrders.getById(shippingOrderId);

				// Only allow Loading status
				if (order.status !== "Loading") {
					enqueueSnackbar("Shipping order is not in Loading status", { variant: "error" });
					navigate("/warehouse");
					return;
				}

				setShippingOrder(order);

				// Fetch manifests based on shipment type
				if (order.shipment_type === "Hand_Delivery") {
					try {
						// Debug: Fetch ALL manifests to see what's in the database
						const { error: allError } = await supabase.from("manifests").select("*");

						if (allError) console.error("Error fetching all manifests:", allError);
						const handDeliveryManifests = await manifestsApi.getFiltered({
							type: "Hand",
							status: "Open",
						});

						if (handDeliveryManifests.length === 0) {
							console.warn("⚠️ [SCREEN 11] No hand delivery manifests found with type='Hand' and status='Open'");
						}
						setManifests(handDeliveryManifests);
					} catch (manifestError) {
						console.error("❌ [SCREEN 11] Error loading hand delivery manifests:", manifestError);
						// Don't fail completely, just show empty list
						setManifests([]);
					}
				} else if (order.shipment_type === "Container_Loading") {
					try {
						// Debug: Fetch ALL manifests to see what's in the database
						const { error: allError } = await supabase.from("manifests").select("*");

						if (allError) console.error("Error fetching all manifests:", allError);
						const containerManifests = await manifestsApi.getFiltered({
							type: "Container",
							status: "Open",
						});

						if (containerManifests.length === 0) {
							console.warn("⚠️ [SCREEN 11] No container manifests found with type='Container' and status='Open'");
						}
						setManifests(containerManifests);
					} catch (manifestError) {
						console.error("❌ [SCREEN 11] Error loading container manifests:", manifestError);
						// Don't fail completely, just show empty list
						setManifests([]);
					}
				}
			} catch (error_) {
				const message = error_ instanceof Error ? error_.message : "Failed to load data";
				setError(message);
				enqueueSnackbar(message, { variant: "error" });
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [shippingOrderId, navigate, enqueueSnackbar]);

	// Handle Create New Manifest for Hand Delivery
	const handleStartLoading = async () => {
		if (!shippingOrder) return;

		try {
			setIsSubmitting(true);

			// Generate trip reference for seal_num (TRIP-YYYY-###)
			const year = new Date().getFullYear();
			const randomNum = Math.floor(Math.random() * 1000)
				.toString()
				.padStart(3, "0");
			const tripRef = `TRIP-${year}-${randomNum}`;

			// Create new Hand Delivery manifest
			const newManifest = await manifestsApi.create({
				type: "Hand",
				seal_num: tripRef,
				status: "Open",
			});

			enqueueSnackbar(`✅ Created new Hand Delivery Trip`, { variant: "success" });

			// Navigate to Screen 12 with manifest info
			navigate("/warehouse/load-pallets", {
				state: {
					shippingOrderId: shippingOrder.id,
					manifestId: newManifest.id,
					shipmentType: shippingOrder.shipment_type,
					orderRef: shippingOrder.order_ref,
					sealNum: shippingOrder.seal_num,
				},
			});
		} catch (error_) {
			console.error("❌ [SCREEN 11] Error creating manifest:", error_);
			const message = error_ instanceof Error ? error_.message : "Failed to create manifest";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle manifest selection for Container Loading
	const handleSelectManifest = async (manifest: Manifest) => {
		if (!shippingOrder) return;

		try {
			setIsSubmitting(true);
			// Navigate to Screen 12 with manifest info
			navigate("/warehouse/load-pallets", {
				state: {
					shippingOrderId: shippingOrder.id,
					shipmentType: shippingOrder.shipment_type,
					manifestId: manifest.id,
				},
			});
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to select manifest";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle back button
	const handleBack = () => {
		navigate("/warehouse/pick-pallets", {
			state: { shippingOrderId },
		});
	};

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
				<Button startIcon={<ArrowLeftIcon />} onClick={handleBack} sx={{ mt: 2 }}>
					Back
				</Button>
			</Box>
		);
	}

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<Typography variant="h5" sx={{ fontWeight: 600 }}>
					Load Target Selection
				</Typography>
				<Button startIcon={<ArrowLeftIcon />} onClick={handleBack} disabled={isSubmitting} variant="outlined">
					Back
				</Button>
			</Box>

			{/* Order Info Card */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
						<Box>
							<Typography color="textSecondary" gutterBottom>
								Order Reference
							</Typography>
							<Typography variant="h6">{shippingOrder.order_ref}</Typography>
						</Box>
						<Box>
							<Typography color="textSecondary" gutterBottom>
								Shipment Type
							</Typography>
							<Chip
								label={shippingOrder.shipment_type === "Hand_Delivery" ? "Hand Delivery" : "Container Loading"}
								color={shippingOrder.shipment_type === "Hand_Delivery" ? "primary" : "secondary"}
								variant="outlined"
							/>
						</Box>
						{shippingOrder.seal_num && (
							<Box>
								<Typography color="textSecondary" gutterBottom>
									Seal Number
								</Typography>
								<Typography variant="h6">{shippingOrder.seal_num}</Typography>
							</Box>
						)}
					</Box>
				</CardContent>
			</Card>

			{/* Hand Delivery Branch */}
			{shippingOrder.shipment_type === "Hand_Delivery" && (
				<Box>
					<Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
						Open Hand Delivery Trips
					</Typography>

					{manifests.length === 0 ? (
						<Alert severity="info" sx={{ mb: 3 }}>
							No open hand delivery trips available. Create a new one to get started.
						</Alert>
					) : (
						<TableContainer component={Paper} sx={{ mb: 3 }}>
							<Table>
								<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Manifest Ref</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Seal #</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
										<TableCell align="center" sx={{ fontWeight: 600 }}>
											Select
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{manifests.map((manifest) => (
										<TableRow key={manifest.id} hover>
											<TableCell>{manifest.id.slice(0, 8)}</TableCell>
											<TableCell>{manifest.type}</TableCell>
											<TableCell>{manifest.seal_num}</TableCell>
											<TableCell>{manifest.status}</TableCell>
											<TableCell align="center">
												<Button
													variant="outlined"
													size="small"
													onClick={() => handleSelectManifest(manifest)}
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

					<Button
						variant="contained"
						size="large"
						startIcon={<CheckCircleIcon />}
						onClick={handleStartLoading}
						disabled={isSubmitting}
						fullWidth
					>
						{isSubmitting ? <CircularProgress size={24} /> : "Create New Manifest"}
					</Button>
				</Box>
			)}

			{/* Container Loading Branch */}
			{shippingOrder.shipment_type === "Container_Loading" && (
				<Box>
					<Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
						Select Container Manifest
					</Typography>

					{manifests.length === 0 ? (
						<Alert severity="warning" sx={{ mb: 3 }}>
							No open container manifests available
						</Alert>
					) : (
						<TableContainer component={Paper} sx={{ mb: 3 }}>
							<Table>
								<TableHead sx={{ backgroundColor: "#f5f5f5" }}>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Manifest Ref</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Container #</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Seal #</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
										<TableCell align="center" sx={{ fontWeight: 600 }}>
											Select
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{manifests.map((manifest) => (
										<TableRow key={manifest.id} hover>
											<TableCell>{manifest.id.slice(0, 8)}</TableCell>
											<TableCell>{manifest.type}</TableCell>
											<TableCell>{manifest.container_num || "N/A"}</TableCell>
											<TableCell>{manifest.seal_num}</TableCell>
											<TableCell>{manifest.status}</TableCell>
											<TableCell align="center">
												<Button
													variant="outlined"
													size="small"
													onClick={() => handleSelectManifest(manifest)}
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
				</Box>
			)}
		</Box>
	);
}
