/* eslint-disable unicorn/filename-case */
/**
 * Screen 4: Manifest Registration
 *
 * CSE user registers manifests for both Container Loading and Hand Delivery.
 * Creates manifest record for tracking outbound shipments.
 *
 * Updated Acceptance Criteria:
 * 1. Form: Manifest Type (Container/Hand Delivery), Seal # (required)
 * 2. If Container: Require Container # + Seal #
 * 3. If Hand Delivery: Require Seal # Only
 * 4. Create manifest (type=Container/Hand_Delivery, status=Open)
 * 5. Display success message
 * 6. Redirect to dashboard
 * 7. Error handling
 */

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Alert,
	Box,
	Button,
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
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { useSnackbar } from "notistack";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { manifests } from "../../lib/api/wms-api";
import { formatContainerNumber, getContainerNumberPlaceholder } from "../../lib/formatters";
import { containerSchema } from "../../lib/validators";

// Validation schema
const containerFormSchema = containerSchema;

type ContainerFormData = z.infer<typeof containerSchema>;

export default function Screen4() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successData, setSuccessData] = useState<ContainerFormData | null>(null);

	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
	} = useForm<ContainerFormData>({
		resolver: zodResolver(containerFormSchema),
		defaultValues: {
			manifest_type: "Container",
		},
	});

	// Watch manifest type to conditionally show container number
	const manifestType = watch("manifest_type");

	// Format container number on change
	const handleContainerNumChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatContainerNumber(event.target.value);
		setValue("container_num", formatted);
	};

	const onSubmit = async (data: ContainerFormData) => {
		try {
			setIsSubmitting(true);

			const _newManifest = await manifests.create({
				type: data.manifest_type,
				container_num: data.manifest_type === "Container" ? data.container_num : undefined,
				seal_num: data.seal_num,
				status: "Open",
			});
			setSuccessData(data);
			const manifestTypeText = data.manifest_type === "Container" ? "Container" : "Hand Delivery";
			enqueueSnackbar(`✅ ${manifestTypeText} manifest registered: ${data.seal_num}`, { variant: "success" });

			// Redirect after 2 seconds
			setTimeout(() => {
				navigate("/warehouse");
			}, 2000);
		} catch (error) {
			console.error("Error registering container:", error);
			console.error("Error details:", JSON.stringify(error, null, 2));
			const message = error instanceof Error ? error.message : "Failed to register container";
			enqueueSnackbar(`Error: ${message}`, { variant: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	if (successData) {
		return (
			<Box sx={{ p: 3 }}>
				<Box sx={{ textAlign: "center", py: 6 }}>
					<CheckCircleIcon size={48} style={{ color: "#28a745", marginBottom: 16 }} />
					<Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
						Manifest Registered Successfully!
					</Typography>
					<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
						Type: <strong>{successData.manifest_type === "Container" ? "Container" : "Hand Delivery"}</strong>
					</Typography>
					{successData.container_num && (
						<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
							Container: <strong>{successData.container_num}</strong>
						</Typography>
					)}
					<Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
						Seal: <strong>{successData.seal_num}</strong>
					</Typography>
					<Typography variant="body2" color="textSecondary">
						Redirecting to dashboard...
					</Typography>
				</Box>
			</Box>
		);
	}

	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
				<Button startIcon={<ArrowLeftIcon size={20} />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
					Back
				</Button>
				<Typography variant="h4" sx={{ flex: 1, fontWeight: "bold" }}>
					📦 Register Manifest
				</Typography>
			</Box>

			{/* Description */}
			<Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
				Register a manifest for outbound shipments (Container or Hand Delivery)
			</Typography>

			{/* Form */}
			<form onSubmit={handleSubmit(onSubmit)}>
				{/* Manifest Type */}
				<FormControl sx={{ mb: 2 }} fullWidth disabled={isSubmitting}>
					<Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
						Manifest Type
					</Typography>
					<Controller
						name="manifest_type"
						control={control}
						render={({ field }) => (
							<RadioGroup {...field} row>
								<FormControlLabel value="Container" control={<Radio />} label="Container" />
								<FormControlLabel value="Hand" control={<Radio />} label="Hand Delivery" />
							</RadioGroup>
						)}
					/>
					{errors.manifest_type && <FormHelperText error>{errors.manifest_type.message}</FormHelperText>}
				</FormControl>

				{/* Container Number (only for Container type) */}
				{manifestType === "Container" && (
					<TextField
						fullWidth
						label="Container Number"
						placeholder={getContainerNumberPlaceholder()}
						{...register("container_num")}
						onChange={handleContainerNumChange}
						value={watch("container_num") || ""}
						error={!!errors.container_num}
						helperText={errors.container_num?.message || "Format: CONT-1234567 (4 letters, 7 numbers)"}
						sx={{ mb: 2 }}
						disabled={isSubmitting}
					/>
				)}

				{/* Seal Number (required for both types) */}
				<TextField
					fullWidth
					label="Seal Number"
					placeholder="e.g., SEAL-12345"
					{...register("seal_num")}
					error={!!errors.seal_num}
					helperText={errors.seal_num?.message || "Required for all manifests"}
					sx={{ mb: 3 }}
					disabled={isSubmitting}
				/>

				{/* Submit Button */}
				<Button
					fullWidth
					variant="contained"
					color="primary"
					type="submit"
					disabled={isSubmitting}
					sx={{ height: 48, mb: 3 }}
				>
					{isSubmitting ? <CircularProgress size={24} /> : "Register Container"}
				</Button>
			</form>

			{/* Info */}
			<Alert severity="info">
				This container will be available for loading pallets in the Loading workflow (Screen 12).
			</Alert>
		</Box>
	);
}
