import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Box,
	Button,
	Card,
	CardContent,
	Divider,
	FormControl,
	FormHelperText,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	TextField,
	Typography,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { toast } from "@/components/core/toaster";
import { MainLayout } from "@/components/main-layout";

// Form schema definition with Zod
const containerSchema = z.object({
	number: z.string().optional(),
	pieces: z.coerce.number().int().min(0, "Must be a non-negative integer"),
	weight_kg: z.coerce.number().min(0, "Must be a non-negative number"),
});

const formSchema = z.object({
	reference: z.string().min(3, "Reference must be at least 3 characters"),
	customer: z.string().min(1, "Customer is required"),
	incoterm: z.string().optional(),
	origin_port: z.string().optional(),
	destination_port: z.string().optional(),
	issue_date: z.string().optional(),
	due_date: z.string().optional(),
	tax_id: z.string().optional(),
	containers: z.array(containerSchema),
});

type FormValues = z.infer<typeof formSchema>;

// Mock data
const MOCK_CUSTOMERS = [
	{ id: "1", name: "PriceSmart Aruba" },
	{ id: "2", name: "ACME Imports" },
	{ id: "3", name: "Demo Client" },
];

const MOCK_INCOTERMS = [
	{ id: "FOB", name: "FOB - Free On Board" },
	{ id: "CIF", name: "CIF - Cost, Insurance & Freight" },
	{ id: "DDP", name: "DDP - Delivered Duty Paid" },
];

export function Page() {
	const navigate = useNavigate();
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Initialize form with React Hook Form + Zod resolver
	const {
		control,
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			reference: "",
			customer: "",
			incoterm: "",
			origin_port: "",
			destination_port: "",
			issue_date: "",
			due_date: "",
			tax_id: "",
			containers: [],
		},
	});

	// Field array for containers
	const { fields, append, remove } = useFieldArray({
		control,
		name: "containers",
	});

	// Add an empty container
	const handleAddContainer = () => {
		append({
			number: "",
			pieces: 0,
			weight_kg: 0,
		});
	};

	// Form submission
	const onSubmit = async (_data: FormValues) => {
		setIsSubmitting(true);

		try {
			// TODO: Replace with real API call when backend is ready
			// const response = await axios.post(`${import.meta.env.VITE_API_URL}/fcl`, _data);
			// console.log("FCL shipment created:", response.data);

			// Show success toast
			toast.success("New FCL shipment created successfully!");

			// Stay on the page (don't navigate)
		} catch (error) {
			console.error("Error submitting form:", error);
			toast.error("An error occurred while creating the shipment.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<MainLayout>
			<Box sx={{ mb: 3 }}>
				<Typography variant="h4" component="h1" gutterBottom>
					New FCL Shipment
				</Typography>
				<Typography variant="body1" color="text.secondary">
					Create a new full container load shipment
				</Typography>
			</Box>

			<Paper elevation={1} sx={{ p: 4 }}>
				<form onSubmit={handleSubmit(onSubmit)}>
					<Typography variant="h6" sx={{ mb: 3 }}>
						Basic information
					</Typography>
					<Grid container spacing={3}>
						{/* Customer */}
						<Grid size={{ xs: 12, md: 6 }}>
							<FormControl fullWidth required error={!!errors.customer}>
								<InputLabel id="customer-label">Customer</InputLabel>
								<Controller
									name="customer"
									control={control}
									render={({ field }) => (
										<Select labelId="customer-label" label="Customer" {...field}>
											{MOCK_CUSTOMERS.map((customer) => (
												<MenuItem key={customer.id} value={customer.id}>
													{customer.name}
												</MenuItem>
											))}
										</Select>
									)}
								/>
								{errors.customer && <FormHelperText>{errors.customer.message}</FormHelperText>}
							</FormControl>
						</Grid>

						{/* Reference Number */}
						<Grid size={{ xs: 12, md: 6 }}>
							<TextField
								label="Number"
								required
								fullWidth
								defaultValue="FCL-0001"
								{...register("reference")}
								error={!!errors.reference}
								helperText={errors.reference?.message}
							/>
						</Grid>

						{/* Issue Date Field */}
						<Grid size={{ xs: 12, md: 6 }}>
							<TextField
								label="Issue Date"
								type="date"
								fullWidth
								InputLabelProps={{ shrink: true }}
								{...register("issue_date")}
								error={!!errors.issue_date}
								helperText={errors.issue_date?.message}
							/>
						</Grid>

						{/* Due Date Field */}
						<Grid size={{ xs: 12, md: 6 }}>
							<TextField
								label="Due Date"
								type="date"
								fullWidth
								InputLabelProps={{ shrink: true }}
								{...register("due_date")}
								error={!!errors.due_date}
								helperText={errors.due_date?.message}
							/>
						</Grid>

						{/* Incoterm Field */}
						<Grid size={{ xs: 12, md: 6 }}>
							<FormControl fullWidth>
								<InputLabel id="incoterm-label">Incoterm</InputLabel>
								<Select labelId="incoterm-label" label="Incoterm" {...register("incoterm")}>
									{MOCK_INCOTERMS.map((incoterm) => (
										<MenuItem key={incoterm.id} value={incoterm.id}>
											{incoterm.name}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>

						{/* Origin Port Field */}
						<Grid size={{ xs: 12, md: 6 }}>
							<TextField label="Origin Port" fullWidth placeholder="e.g. Shanghai" {...register("origin_port")} />
						</Grid>

						{/* Destination Port Field */}
						<Grid size={{ xs: 12, md: 6 }}>
							<TextField
								label="Destination Port"
								fullWidth
								placeholder="e.g. Los Angeles"
								{...register("destination_port")}
							/>
						</Grid>

						{/* Tax ID Field */}
						<Grid size={{ xs: 12, md: 6 }}>
							<TextField label="Tax ID" fullWidth placeholder="e.g EU372054390" {...register("tax_id")} />
						</Grid>

						{/* Containers Section */}
						<Grid size={{ xs: 12 }}>
							<Divider sx={{ my: 2 }} />
							<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
								<Typography variant="h6">Containers</Typography>
								<Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddContainer}>
									Add container
								</Button>
							</Box>

							{fields.length === 0 && (
								<Card variant="outlined" sx={{ mb: 2, bgcolor: "background.default" }}>
									<CardContent sx={{ textAlign: "center" }}>
										<Typography color="text.secondary">
											No containers added yet. Click &quot;Add container&quot; to add one.
										</Typography>
									</CardContent>
								</Card>
							)}

							{fields.map((field, index) => (
								<Card key={field.id} variant="outlined" sx={{ mb: 2 }}>
									<CardContent>
										<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
											<Typography variant="subtitle1">Container #{index + 1}</Typography>
											<IconButton onClick={() => remove(index)} color="error" size="small">
												<Trash2 size={18} />
											</IconButton>
										</Box>

										<Grid container spacing={2}>
											{/* Container Number */}
											<Grid size={{ xs: 12, md: 4 }}>
												<TextField
													label="Container Number"
													fullWidth
													{...register(`containers.${index}.number`)}
													error={!!errors.containers?.[index]?.number}
													helperText={errors.containers?.[index]?.number?.message || "e.g., MSCU1234567"}
												/>
											</Grid>

											{/* Pieces */}
											<Grid size={{ xs: 12, md: 4 }}>
												<TextField
													label="Pieces"
													type="number"
													fullWidth
													inputProps={{ min: 0 }}
													{...register(`containers.${index}.pieces`)}
													error={!!errors.containers?.[index]?.pieces}
													helperText={errors.containers?.[index]?.pieces?.message}
												/>
											</Grid>

											{/* Weight (kg) */}
											<Grid size={{ xs: 12, md: 4 }}>
												<TextField
													label="Weight (kg)"
													type="number"
													fullWidth
													inputProps={{ min: 0, step: "0.01" }}
													{...register(`containers.${index}.weight_kg`)}
													error={!!errors.containers?.[index]?.weight_kg}
													helperText={errors.containers?.[index]?.weight_kg?.message}
												/>
											</Grid>
										</Grid>
									</CardContent>
								</Card>
							))}
						</Grid>

						{/* Submit Buttons */}
						<Grid size={{ xs: 12 }}>
							<Divider sx={{ my: 2 }} />
							<Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
								<Button variant="outlined" onClick={() => navigate("/fcl")}>
									Cancel
								</Button>
								<Button type="submit" variant="contained" disabled={isSubmitting}>
									Create Shipment
								</Button>
							</Box>
						</Grid>
					</Grid>
				</form>
			</Paper>
		</MainLayout>
	);
}
