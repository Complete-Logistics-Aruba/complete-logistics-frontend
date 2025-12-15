/**
 * Health Check Page
 *
 * Displays system health status including Supabase connectivity.
 * Public route - no authentication required.
 * Used for deployment verification and monitoring.
 *
 * @module pages/Health
 */
import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from "@mui/material";

import { appConfig } from "@/config/app";
import { wmsApi } from "@/lib/api";

interface HealthStatus {
	supabase: "connected" | "failed" | "checking";
	error?: string;
	lastChecked?: string;
}

/**
 * Health Check Page Component
 *
 * Displays application health status and Supabase connectivity.
 * Auto-refreshes every 10 seconds.
 */
export function Health() {
	const [health, setHealth] = useState<HealthStatus>({
		supabase: "checking",
	});
	const [autoRefresh, setAutoRefresh] = useState(true);

	/**
	 * Check Supabase connectivity
	 */
	const checkHealth = async () => {
		setHealth((prev) => ({ ...prev, supabase: "checking" }));

		try {
			// Attempt to query Supabase
			await wmsApi.health.check();

			setHealth({
				supabase: "connected",
				lastChecked: new Date().toLocaleTimeString(),
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			setHealth({
				supabase: "failed",
				error: errorMessage,
				lastChecked: new Date().toLocaleTimeString(),
			});
		}
	};

	// Initial health check
	useEffect(() => {
		checkHealth();
	}, []);

	// Auto-refresh every 10 seconds
	useEffect(() => {
		if (!autoRefresh) return;

		const interval = setInterval(() => {
			checkHealth();
		}, 10_000);

		return () => clearInterval(interval);
	}, [autoRefresh]);

	// Get version from package.json (fallback to "1.0.0")
	const version = "1.0.0";

	return (
		<Container maxWidth="sm">
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "100vh",
					py: 4,
				}}
			>
				<Card sx={{ width: "100%", boxShadow: 3 }}>
					<CardContent sx={{ p: 4 }}>
						{/* Header */}
						<Stack spacing={2} sx={{ mb: 4 }}>
							<Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
								Health Check
							</Typography>
							<Typography variant="body2" color="textSecondary">
								System status and connectivity verification
							</Typography>
						</Stack>

						{/* System Information */}
						<Stack spacing={2} sx={{ mb: 4 }}>
							<Box>
								<Typography variant="caption" color="textSecondary">
									Application
								</Typography>
								<Typography variant="body1">{appConfig.name}</Typography>
							</Box>

							<Box>
								<Typography variant="caption" color="textSecondary">
									Version
								</Typography>
								<Typography variant="body1">{version}</Typography>
							</Box>

							<Box>
								<Typography variant="caption" color="textSecondary">
									Environment
								</Typography>
								<Typography variant="body1" sx={{ textTransform: "uppercase" }}>
									{appConfig.envName}
								</Typography>
							</Box>

							<Box>
								<Typography variant="caption" color="textSecondary">
									Current Time
								</Typography>
								<Typography variant="body1">{new Date().toLocaleString()}</Typography>
							</Box>
						</Stack>

						{/* Supabase Status */}
						<Stack spacing={2} sx={{ mb: 4 }}>
							<Typography variant="h6" sx={{ fontWeight: "bold" }}>
								Supabase Connectivity
							</Typography>

							{health.supabase === "checking" && (
								<Alert severity="info" icon={<CircularProgress size={20} />}>
									Checking connectivity...
								</Alert>
							)}

							{health.supabase === "connected" && <Alert severity="success">✓ Connected to Supabase</Alert>}

							{health.supabase === "failed" && (
								<Alert severity="error">
									✗ Failed to connect to Supabase
									{health.error && <Box sx={{ mt: 1, fontSize: "0.875rem" }}>Error: {health.error}</Box>}
								</Alert>
							)}

							{health.lastChecked && (
								<Typography variant="caption" color="textSecondary">
									Last checked: {health.lastChecked}
								</Typography>
							)}
						</Stack>

						{/* Auto-refresh Status */}
						<Stack spacing={2} sx={{ mb: 4 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
								<Typography variant="body2">Auto-refresh: {autoRefresh ? "ON (every 10s)" : "OFF"}</Typography>
							</Box>
						</Stack>

						{/* Action Buttons */}
						<Stack direction="row" spacing={2}>
							<Button variant="contained" onClick={checkHealth} disabled={health.supabase === "checking"}>
								Refresh Now
							</Button>
							<Button variant="outlined" onClick={() => setAutoRefresh(!autoRefresh)}>
								{autoRefresh ? "Disable" : "Enable"} Auto-refresh
							</Button>
						</Stack>
					</CardContent>
				</Card>
			</Box>
		</Container>
	);
}

export default Health;
