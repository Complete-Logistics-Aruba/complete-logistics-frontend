import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TruckIcon } from "@phosphor-icons/react/dist/ssr/Truck";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

import type { ShippingOrder } from "@/types/domain";
import type { Metadata } from "@/types/metadata";
import { appConfig } from "@/config/app";
import { paths } from "@/paths";
import { receivingOrders, shippingOrders } from "@/lib/api/wms-api";
import { useAuth } from "@/lib/auth/use-auth";

const metadata = { title: `${appConfig.name} - Dashboard` } satisfies Metadata;

export function Page(): React.JSX.Element {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [inboundPending, setInboundPending] = useState<number>(0);
	const [outboundPending, setOutboundPending] = useState<number>(0);
	const [loading, setLoading] = useState(true);

	// Load pending counts on mount
	useEffect(() => {
		const loadCounts = async () => {
			try {
				setLoading(true);

				// Fetch receiving orders with pending status
				const receivingOrdersList = await receivingOrders.list();
				const pendingReceiving = receivingOrdersList?.filter((order) => order.status === "Pending").length || 0;

				// Fetch shipping orders with pending status
				const shippingOrdersList = await shippingOrders.getAll();
				const pendingShipping =
					shippingOrdersList?.filter((order: ShippingOrder) => order.status === "Pending").length || 0;

				setInboundPending(pendingReceiving);
				setOutboundPending(pendingShipping);
			} catch (error) {
				console.error("Error loading pending counts:", error);
				setInboundPending(0);
				setOutboundPending(0);
			} finally {
				setLoading(false);
			}
		};

		loadCounts();
	}, []);

	const isCustomerService = user?.role === "Customer Service";
	const isWarehouse = user?.role === "Warehouse";

	return (
		<React.Fragment>
			<Helmet>
				<title>{metadata.title}</title>
			</Helmet>
			<Box
				sx={{
					maxWidth: "var(--Content-maxWidth)",
					m: "var(--Content-margin)",
					p: "var(--Content-padding)",
					width: "var(--Content-width)",
					transition: "all 0.2s ease-in-out",
				}}
			>
				<Stack spacing={4}>
					{/* Welcome Header */}
					<Box sx={{ mb: 2 }}>
						<Typography
							variant="h4"
							sx={{
								fontWeight: 700,
								mb: 0.5,
								background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
								backgroundClip: "text",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
							}}
						>
							Welcome, {user?.email?.split("@")[0] || "User"}! 👋
						</Typography>
					</Box>

					{/* Metric Cards - Top Section */}
					<Box>
						<Grid container spacing={3}>
							<Grid size={{ xs: 12, sm: 6 }}>
								<Card
									sx={{
										background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
										color: "white",
										boxShadow: "0 8px 16px rgba(102, 126, 234, 0.3)",
									}}
								>
									<CardContent>
										<Stack spacing={2}>
											<Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														width: 48,
														height: 48,
														borderRadius: 1,
														bgcolor: "rgba(255, 255, 255, 0.2)",
													}}
												>
													<TruckIcon size={24} />
												</Box>
												<Box sx={{ flex: 1 }}>
													<Typography variant="body2" sx={{ opacity: 0.9 }}>
														Inbound Pending
													</Typography>
													<Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
														{loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : inboundPending}
													</Typography>
												</Box>
											</Stack>
										</Stack>
									</CardContent>
								</Card>
							</Grid>

							<Grid size={{ xs: 12, sm: 6 }}>
								<Card
									sx={{
										background: "linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%)",
										color: "white",
										boxShadow: "0 8px 16px rgba(255, 107, 53, 0.3)",
									}}
								>
									<CardContent>
										<Stack spacing={2}>
											<Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														width: 48,
														height: 48,
														borderRadius: 1,
														bgcolor: "rgba(255, 255, 255, 0.2)",
													}}
												>
													<TruckIcon size={24} />
												</Box>
												<Box sx={{ flex: 1 }}>
													<Typography variant="body2" sx={{ opacity: 0.9 }}>
														Outbound Pending
													</Typography>
													<Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
														{loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : outboundPending}
													</Typography>
												</Box>
											</Stack>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					</Box>

					{/* Quick Actions */}
					<Box>
						<Typography variant="h5" sx={{ mb: 2 }}>
							Quick Actions
						</Typography>

						{isCustomerService && (
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Button
										fullWidth
										variant="contained"
										endIcon={<ArrowRightIcon />}
										onClick={() => navigate(paths.warehouseScreens.screen1)}
										sx={{ py: 1.5 }}
									>
										<PlusIcon size={20} style={{ marginRight: 8 }} />
										New Inbound Order
									</Button>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Button
										fullWidth
										variant="contained"
										disabled
										endIcon={<ArrowRightIcon />}
										title="Coming in next milestone"
										sx={{
											py: 1.5,
											backgroundColor: "primary.main",
											color: "white",
											"&.Mui-disabled": {
												backgroundColor: "primary.main",
												color: "white",
											},
										}}
									>
										<PlusIcon size={20} style={{ marginRight: 8 }} />
										New Outbound Order
									</Button>
								</Grid>
							</Grid>
						)}

						{isWarehouse && (
							<Grid container spacing={2}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Button
										fullWidth
										variant="contained"
										endIcon={<ArrowRightIcon />}
										onClick={() => navigate(paths.warehouseScreens.screen5)}
										sx={{ py: 1.5 }}
									>
										Start Receiving
									</Button>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<Button
										fullWidth
										variant="contained"
										disabled
										endIcon={<ArrowRightIcon />}
										title="Coming in next milestone"
										sx={{
											py: 1.5,
											backgroundColor: "primary.main",
											color: "white",
											"&.Mui-disabled": {
												backgroundColor: "primary.main",
												color: "white",
											},
										}}
									>
										Start Picking
									</Button>
								</Grid>
							</Grid>
						)}
					</Box>
				</Stack>
			</Box>
		</React.Fragment>
	);
}
