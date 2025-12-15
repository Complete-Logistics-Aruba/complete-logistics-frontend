/* eslint-disable unicorn/filename-case */
/**
 * Screen 3: Shipping Order Creation
 *
 * CSE creates shipping orders with shipment type and CSV validation.
 * Supports Hand Delivery (with Seal #) and Container Loading.
 *
 * Story 6.1 Acceptance Criteria:
 * 1. Form: Shipment Type, CSV upload, optional Seal #
 * 2. CSV validation: item_id exists, qty_ordered > 0
 * 3. Error handling with row numbers
 * 4. Create shipping_order + shipping_order_lines
 * 5. Display success message
 * 6. Redirect to Screen 9 (Pending Shipping Orders)
 */

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	FormControl,
	FormControlLabel,
	FormHelperText,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { UploadIcon } from "@phosphor-icons/react/dist/ssr/Upload";
import { useSnackbar } from "notistack";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { products, shippingOrders } from "../../lib/api/wms-api";
import { useAuth } from "../../lib/auth/auth-context";

// Form validation schema
const shippingOrderSchema = z
	.object({
		shipmentType: z.enum(["Hand_Delivery", "Container_Loading"], {
			errorMap: () => ({ message: "Please select a shipment type" }),
		}),
		sealNum: z.string().optional(),
		csvFile: z.instanceof(File).optional(),
	})
	.refine(
		(data) => {
			// Seal # required for Hand Delivery
			if (data.shipmentType === "Hand_Delivery" && !data.sealNum?.trim()) {
				return false;
			}
			return true;
		},
		{
			message: "Seal # is required for Hand Delivery",
			path: ["sealNum"],
		}
	)
	.refine(
		(data) => {
			// CSV file required
			if (!data.csvFile) {
				return false;
			}
			return true;
		},
		{
			message: "CSV file is required",
			path: ["csvFile"],
		}
	);

type ShippingOrderFormData = z.infer<typeof shippingOrderSchema>;

interface CSVError {
	row: number;
	field: string;
	message: string;
}

export default function Screen3() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const { user } = useAuth();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [csvErrors, setCSVErrors] = useState<CSVError[]>([]);
	const [selectedFileName, setSelectedFileName] = useState<string>("");

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors },
		reset,
	} = useForm<ShippingOrderFormData>({
		resolver: zodResolver(shippingOrderSchema),
		defaultValues: {
			shipmentType: "Hand_Delivery",
			sealNum: "",
			csvFile: undefined,
		},
	});

	const shipmentType = watch("shipmentType");

	const onSubmit = async (data: ShippingOrderFormData) => {
		if (!data.csvFile) {
			enqueueSnackbar("CSV file is required", { variant: "error" });
			return;
		}

		try {
			setIsSubmitting(true);
			setCSVErrors([]);

			// Parse and validate CSV
			const text = await data.csvFile.text();
			const csvLines = text.trim().split("\n");
			const records: Array<{ item_id: string; qty_ordered: number }> = [];
			const validationErrors: CSVError[] = [];

			// Parse CSV (skip header)
			for (let i = 1; i < csvLines.length; i++) {
				const [itemId, qtyStr] = csvLines[i].split(",").map((s) => s.trim());

				if (!itemId || !qtyStr) {
					validationErrors.push({
						row: i + 1,
						field: "item_id/qty_ordered",
						message: "Missing required fields",
					});
					continue;
				}

				const qty = Number.parseInt(qtyStr, 10);

				if (Number.isNaN(qty) || qty <= 0) {
					validationErrors.push({
						row: i + 1,
						field: "qty_ordered",
						message: "qty_ordered must be a positive integer",
					});
					continue;
				}

				records.push({ item_id: itemId, qty_ordered: qty });
			}

			// Validate against products
			const productsList = await products.getAll();
			const productMap = new Map(productsList.map((p) => [p.item_id, p]));

			for (const [i, record] of records.entries()) {
				if (!productMap.has(record.item_id)) {
					validationErrors.push({
						row: i + 2, // +2 because of header and 0-indexing
						field: "item_id",
						message: `Item ID '${record.item_id}' not found in products`,
					});
				}
			}

			// If validation errors, display and stop
			if (validationErrors.length > 0) {
				setCSVErrors(validationErrors);
				enqueueSnackbar(`CSV validation failed: ${validationErrors.length} error(s)`, { variant: "error" });
				return;
			}

			// Create shipping order
			if (!user?.id) {
				enqueueSnackbar("User not authenticated", { variant: "error" });
				return;
			}

			const orderRef = `ORD-${Date.now()}`;
			const shippingOrder = await shippingOrders.create({
				order_ref: orderRef,
				shipment_type: data.shipmentType,
				seal_num: data.shipmentType === "Hand_Delivery" ? data.sealNum : undefined,
				status: "Pending",
			});

			// Create shipping order lines
			const orderLines = records.map((record) => {
				return {
					shipping_order_id: shippingOrder.id,
					item_id: record.item_id,
					requested_qty: record.qty_ordered,
				};
			});

			await shippingOrders.createLines(orderLines);

			// Show success message only
			enqueueSnackbar(`✅ Shipping order created: ${orderRef}`, { variant: "success" });

			// Reset form
			reset();
		} catch (error) {
			console.error("Error creating shipping order:", error);
			const message = error instanceof Error ? error.message : "Failed to create shipping order";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
				<Button startIcon={<ArrowLeftIcon size={20} />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
					Back
				</Button>
				<Typography variant="h4" sx={{ flex: 1, fontWeight: "bold" }}>
					📦 Create Shipping Order
				</Typography>
			</Box>

			{/* Form */}
			<Box>
				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Shipment Type */}
					<Box sx={{ mb: 3 }}>
						<Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
							Shipment Type
						</Typography>
						<Controller
							name="shipmentType"
							control={control}
							render={({ field }) => (
								<FormControl error={!!errors.shipmentType}>
									<RadioGroup {...field} row>
										<FormControlLabel value="Hand_Delivery" control={<Radio />} label="Hand Delivery" />
										<FormControlLabel value="Container_Loading" control={<Radio />} label="Container Loading" />
									</RadioGroup>
									{errors.shipmentType && <FormHelperText>{errors.shipmentType.message}</FormHelperText>}
								</FormControl>
							)}
						/>
					</Box>

					{/* Seal # (for Hand Delivery) */}
					{shipmentType === "Hand_Delivery" && (
						<Box sx={{ mb: 3 }}>
							<Controller
								name="sealNum"
								control={control}
								render={({ field }) => (
									<TextField
										{...field}
										label="Seal #"
										placeholder="e.g., SEAL123"
										fullWidth
										error={!!errors.sealNum}
										helperText={errors.sealNum?.message || "Required for Hand Delivery"}
									/>
								)}
							/>
						</Box>
					)}

					{/* CSV Upload */}
					<Box sx={{ mb: 3 }}>
						<Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
							Shipping CSV
						</Typography>
						<Controller
							name="csvFile"
							control={control}
							render={({ field: { onChange } }) => (
								<Box>
									<input
										type="file"
										accept=".csv"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												setSelectedFileName(file.name);
												onChange(file);
												enqueueSnackbar(`✅ File selected: ${file.name}`, { variant: "success" });
											}
										}}
										style={{ display: "none" }}
										id="csv-input"
									/>
									<label htmlFor="csv-input">
										<Button
											component="span"
											variant="outlined"
											startIcon={<UploadIcon size={20} />}
											fullWidth
											sx={{ mb: 1 }}
										>
											Choose CSV File
										</Button>
									</label>

									{/* Show selected file */}
									{selectedFileName && (
										<Box sx={{ mb: 2, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
											<Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
												✅ Selected File:
											</Typography>
											<Chip
												label={selectedFileName}
												variant="outlined"
												color="primary"
												onDelete={() => {
													setSelectedFileName("");
													onChange();
												}}
											/>
										</Box>
									)}

									{errors.csvFile && <FormHelperText error>{errors.csvFile.message}</FormHelperText>}
								</Box>
							)}
						/>
						<Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
							Format: item_id, qty_ordered (one per row)
						</Typography>
					</Box>

					{/* CSV Errors */}
					{csvErrors.length > 0 && (
						<Alert severity="error" sx={{ mb: 3 }}>
							<Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
								CSV Validation Errors ({csvErrors.length}):
							</Typography>
							{csvErrors.map((err, idx) => (
								<Typography key={idx} variant="body2" sx={{ ml: 2 }}>
									Row {err.row}: {err.field} - {err.message}
								</Typography>
							))}
						</Alert>
					)}

					{/* Submit Button */}
					<Button type="submit" variant="contained" color="primary" fullWidth disabled={isSubmitting} sx={{ mt: 2 }}>
						{isSubmitting ? <CircularProgress size={24} /> : "Create Shipping Order"}
					</Button>
				</form>
			</Box>
		</Box>
	);
}
