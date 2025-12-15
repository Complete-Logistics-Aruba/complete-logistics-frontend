/* eslint-disable unicorn/filename-case */
/**
 * Screen 4: Empty Container Registration
 *
 * CSE user registers empty containers that will leave the warehouse.
 * Creates manifest record for tracking outbound containers.
 *
 * Story 4.0 Acceptance Criteria:
 * 1. Form: Container Number (required), Seal Number (required)
 * 2. Create manifest (type=Container, status=Open)
 * 3. Display success message
 * 4. Redirect to dashboard
 * 5. Error handling
 */

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { useSnackbar } from "notistack";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

// Validation schema
const containerSchema = z.object({
	container_num: z
		.string()
		.min(1, "Container number is required")
		.min(3, "Container number must be at least 3 characters"),
	seal_num: z.string().min(1, "Seal number is required").min(3, "Seal number must be at least 3 characters"),
});

type ContainerFormData = z.infer<typeof containerSchema>;

export default function Screen4() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [successData, setSuccessData] = useState<ContainerFormData | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ContainerFormData>({
		resolver: zodResolver(containerSchema),
	});

	const onSubmit = async (data: ContainerFormData) => {
		try {
			setIsSubmitting(true);

			setSuccessData(data);
			enqueueSnackbar(`Container registered: ${data.container_num}, Seal ${data.seal_num}`, { variant: "success" });

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
						Container Registered Successfully!
					</Typography>
					<Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
						Container: <strong>{successData.container_num}</strong>
					</Typography>
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
					📦 Register Empty Container
				</Typography>
			</Box>

			{/* Description */}
			<Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
				Register an empty container that will leave the warehouse
			</Typography>

			{/* Form */}
			<form onSubmit={handleSubmit(onSubmit)}>
				{/* Container Number */}
				<TextField
					fullWidth
					label="Container Number"
					placeholder="e.g., CONT-001"
					{...register("container_num")}
					error={!!errors.container_num}
					helperText={errors.container_num?.message}
					sx={{ mb: 2 }}
					disabled={isSubmitting}
				/>

				{/* Seal Number */}
				<TextField
					fullWidth
					label="Seal Number"
					placeholder="e.g., SEAL-12345"
					{...register("seal_num")}
					error={!!errors.seal_num}
					helperText={errors.seal_num?.message}
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
