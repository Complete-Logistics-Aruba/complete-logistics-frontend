import React, { useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import axios from "axios";
import { Plus } from "lucide-react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { TableEmptyState } from "@/components/core/empty-states/table-empty-state";
import { PageError } from "@/components/core/error-boundary/page-error";
import { TableSkeleton } from "@/components/core/loading/table-skeleton";
// import { toast } from "@/components/core/toaster";
import { MainLayout } from "@/components/main-layout";

// Define FCL shipment type
interface FCLShipment {
	id: string;
	reference: string;
	customer: string;
	status: "Draft" | "In Progress" | "Closed";
	updatedAt: string;
	issue_date?: string;
	due_date?: string;
	tax_id?: string;
}

// Mock customers for display
const MOCK_CUSTOMERS = [
	{ id: "1", name: "PriceSmart Aruba" },
	{ id: "2", name: "ACME Imports" },
	{ id: "3", name: "Demo Client" },
];

// Helper function to get customer name by ID
const getCustomerName = (customerId: string): string => {
	const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
	return customer ? customer.name : customerId;
};

export function Page() {
	const _navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [shipments, setShipments] = useState<FCLShipment[]>([]);
	const [error, setError] = useState<Error | null>(null);

	// Fetch FCL shipments from API
	const fetchShipments = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/fcl`);
			console.log("Fetched shipments:", response.data);
			setShipments(response.data.results || []);
		} catch (error_) {
			console.error("Error fetching FCL shipments:", error_);
			setError(error_ as Error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchShipments();
	}, []);

	return (
		<MainLayout>
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
				<div>
					<Typography variant="h4" component="h1" gutterBottom>
						Full Container Load (FCL)
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Manage and track full container shipments
					</Typography>
				</div>
				<Button component={RouterLink} to="/fcl/new" variant="contained" startIcon={<Plus size={20} />}>
					New FCL shipment
				</Button>
			</Box>

			{/* Show error component if there's an error */}
			{error && <PageError error={error} onRetry={fetchShipments} />}

			<Paper elevation={1} sx={{ display: error ? "none" : "block" }}>
				<TableContainer>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Reference</TableCell>
								<TableCell>Customer</TableCell>
								<TableCell>Status</TableCell>
								<TableCell>Updated At</TableCell>
								<TableCell align="right">Actions</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								<TableSkeleton columns={5} rows={3} />
							) : shipments.length > 0 ? (
								shipments.map((shipment) => (
									<TableRow key={shipment.id}>
										<TableCell>{shipment.reference}</TableCell>
										<TableCell>{getCustomerName(shipment.customer)}</TableCell>
										<TableCell>
											<Chip
												label={shipment.status}
												color={
													shipment.status === "Draft"
														? "default"
														: shipment.status === "In Progress"
															? "primary"
															: "success"
												}
												size="small"
											/>
										</TableCell>
										<TableCell>
											{new Date(shipment.updatedAt).toLocaleDateString()}{" "}
											{new Date(shipment.updatedAt).toLocaleTimeString()}
										</TableCell>
										<TableCell align="right">
											<Button component={RouterLink} to={`/fcl/${shipment.id}`} size="small">
												View
											</Button>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={5}>
										<TableEmptyState
											title="No FCL shipments yet."
											description="Use 'New FCL shipment' to create your first record."
											actionLabel="New FCL shipment"
										/>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</Paper>
		</MainLayout>
	);
}
