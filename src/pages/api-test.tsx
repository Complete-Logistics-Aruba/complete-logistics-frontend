import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from "@mui/material";

import apiClient from "@/lib/api/api-client";
import { useAuth } from "@/lib/auth/auth-context";

// Test endpoints
const API_ENDPOINTS = [
	{ name: "FCL Shipments", path: "/fcl" },
	{ name: "Consolidation", path: "/consolidation" },
	{ name: "LCL Shipments", path: "/lcl" },
	{ name: "Air Shipments", path: "/air" },
	{ name: "Invoicing", path: "/invoicing" },
	{ name: "Documents", path: "/documents" },
	{ name: "Data Management", path: "/data" },
	{ name: "Admin", path: "/admin" },
];

interface ApiResponse {
	endpoint: string;
	status: number;
	data: unknown;
	error?: string;
}

export function Page() {
	const { isAuthenticated } = useAuth();
	const [loading, setLoading] = useState<boolean>(false);
	const [responses, setResponses] = useState<ApiResponse[]>([]);

	const testAllEndpoints = useCallback(async () => {
		if (!isAuthenticated) {
			return;
		}

		setLoading(true);
		setResponses([]);

		const results: ApiResponse[] = [];

		for (const endpoint of API_ENDPOINTS) {
			try {
				const response = await apiClient.get(endpoint.path);
				results.push({
					endpoint: endpoint.name,
					status: response.status,
					data: response.data,
				});
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				type ErrorWithResponse = { response?: { status?: number } };
				const errorResponse =
					error && typeof error === "object" && "response" in error ? (error as ErrorWithResponse).response : undefined;
				results.push({
					endpoint: endpoint.name,
					status: errorResponse?.status || 0,
					data: null,
					error: errorMessage,
				});
			}
		}

		setResponses(results);
		setLoading(false);
	}, [isAuthenticated]);

	// Automatically test endpoints when page loads
	useEffect(() => {
		// testAllEndpoints already checks for isAuthenticated internally
		testAllEndpoints();
	}, [testAllEndpoints]);

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<Typography variant="h4" component="h1" gutterBottom>
				API Client + MSW Test Page
			</Typography>

			<Typography variant="body1" paragraph>
				This page demonstrates the MSW mock endpoints working with the API client. All requests should return empty
				results as defined in the requirements.
			</Typography>

			{!isAuthenticated && (
				<Alert severity="warning" sx={{ mb: 3 }}>
					You must be logged in to test the API endpoints.
				</Alert>
			)}

			<Box sx={{ mb: 4 }}>
				<Button variant="contained" disabled={loading || !isAuthenticated} onClick={testAllEndpoints}>
					{loading ? "Testing..." : "Test All Endpoints"}
				</Button>
			</Box>

			{loading && (
				<Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
					<CircularProgress />
				</Box>
			)}

			{responses.length > 0 && (
				<Stack spacing={2}>
					{responses.map((response, index) => (
						<Card key={index} variant="outlined" sx={{ mb: 2 }}>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									{response.endpoint}
								</Typography>
								<Typography variant="body2" color="text.secondary" gutterBottom>
									Status: {response.status} {response.status >= 200 && response.status < 300 ? "✓" : "✗"}
								</Typography>
								{response.error ? (
									<Alert severity="error" sx={{ mt: 1 }}>
										{response.error}
									</Alert>
								) : (
									<Box sx={{ mt: 1, overflow: "auto", maxHeight: "200px" }}>
										<pre style={{ margin: 0 }}>{JSON.stringify(response.data, null, 2)}</pre>
									</Box>
								)}
							</CardContent>
						</Card>
					))}
				</Stack>
			)}
		</Container>
	);
}
