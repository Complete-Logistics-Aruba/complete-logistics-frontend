import * as React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Helmet } from "react-helmet-async";

import type { Metadata } from "@/types/metadata";
import { appConfig } from "@/config/app";

const metadata = { title: appConfig.name } satisfies Metadata;

// Helper function to get user-specific FCL key
const getUserFclKey = (): string => {
	try {
		const userJson = localStorage.getItem("user");
		if (userJson) {
			const user = JSON.parse(userJson);
			if (user && user.email) {
				return `fclShipments_${user.email}`;
			}
		}
	} catch (error) {
		console.error("Error getting user for FCL key:", error);
	}
	return "fclShipments_guest";
};

// Helper function to get FCL shipments count from localStorage
const getFclShipmentsCount = (): number => {
	try {
		const key = getUserFclKey();
		const storedShipments = localStorage.getItem(key);
		if (storedShipments) {
			const shipments = JSON.parse(storedShipments);
			return Array.isArray(shipments) ? shipments.length : 0;
		}
	} catch (error) {
		console.error("Error getting FCL shipments count:", error);
	}
	return 0;
};

// Store the previous count in localStorage for trend calculation
const getPreviousFclCount = (): number => {
	try {
		const userKey = getUserFclKey();
		const prevCountKey = `prevFclCount_${userKey}`;
		const prevCount = localStorage.getItem(prevCountKey);
		return prevCount ? Number.parseInt(prevCount, 10) : 0;
	} catch (error) {
		console.error("Error getting previous FCL count:", error);
		return 0;
	}
};

const updatePreviousFclCount = (count: number): void => {
	try {
		// Only update if the current count is different from the previous count
		const prevCount = getPreviousFclCount();
		if (count !== prevCount) {
			const userKey = getUserFclKey();
			const prevCountKey = `prevFclCount_${userKey}`;
			localStorage.setItem(prevCountKey, count.toString());
		}
	} catch (error) {
		console.error("Error updating previous FCL count:", error);
	}
};

export function Page(): React.JSX.Element {
	// Get the FCL count on component mount
	React.useEffect(() => {
		// Get current count
		const currentCount = getFclShipmentsCount();

		// Update previous count for next calculation
		setTimeout(() => {
			updatePreviousFclCount(currentCount);
		}, 1000);
	}, []);
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
					<Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
						<Box sx={{ flex: "1 1 auto" }}>
							<Typography variant="h4">Overview</Typography>
						</Box>
						<div>
							{/* <Button startIcon={<PlusIcon />} variant="contained">
								Dashboard
							</Button> */}
						</div>
					</Stack>
					<Grid container spacing={4}>
						{/* Summary cards removed - use landing.tsx instead */}
						{/* <Grid
							size={{
								md: 8,
								xs: 12,
							}}
						>
							<AppUsage
								data={[
									{ name: "Jan", v1: 36, v2: 19 },
									{ name: "Feb", v1: 45, v2: 23 },
									{ name: "Mar", v1: 26, v2: 12 },
									{ name: "Apr", v1: 39, v2: 20 },
									{ name: "May", v1: 26, v2: 12 },
									{ name: "Jun", v1: 42, v2: 31 },
									{ name: "Jul", v1: 38, v2: 19 },
									{ name: "Aug", v1: 39, v2: 20 },
									{ name: "Sep", v1: 37, v2: 18 },
									{ name: "Oct", v1: 41, v2: 22 },
									{ name: "Nov", v1: 45, v2: 24 },
									{ name: "Dec", v1: 23, v2: 17 },
								]}
							/>
						</Grid> */}
						{/* <Grid
							size={{
								md: 4,
								xs: 12,
							}}
						>
							<Subscriptions
								subscriptions={[
									{
										id: "supabase",
										title: "Supabase",
										icon: "/assets/company-avatar-5.png",
										costs: "$599",
										billingCycle: "year",
										status: "paid",
									},
									{
										id: "vercel",
										title: "Vercel",
										icon: "/assets/company-avatar-4.png",
										costs: "$20",
										billingCycle: "month",
										status: "expiring",
									},
									{
										id: "auth0",
										title: "Auth0",
										icon: "/assets/company-avatar-3.png",
										costs: "$20-80",
										billingCycle: "month",
										status: "canceled",
									},
									{
										id: "google_cloud",
										title: "Google Cloud",
										icon: "/assets/company-avatar-2.png",
										costs: "$100-200",
										billingCycle: "month",
										status: "paid",
									},
									{
										id: "stripe",
										title: "Stripe",
										icon: "/assets/company-avatar-1.png",
										costs: "$70",
										billingCycle: "month",
										status: "paid",
									},
								]}
							/>
						</Grid> */}
						{/* <Grid
							size={{
								md: 4,
								xs: 12,
							}}
						>
							<AppChat
								messages={[
									{
										id: "MSG-001",
										content: "Hello, we spoke earlier on the phone",
										author: { name: "Alcides Antonio", avatar: "/assets/avatar-10.png", status: "online" },
										createdAt: dayjs().subtract(2, "minute").toDate(),
									},
									{
										id: "MSG-002",
										content: "Is the job still available?",
										author: { name: "Marcus Finn", avatar: "/assets/avatar-9.png", status: "offline" },
										createdAt: dayjs().subtract(56, "minute").toDate(),
									},
									{
										id: "MSG-003",
										content: "What is a screening task? I'd like to",
										author: { name: "Carson Darrin", avatar: "/assets/avatar-3.png", status: "online" },
										createdAt: dayjs().subtract(3, "hour").subtract(23, "minute").toDate(),
									},
									{
										id: "MSG-004",
										content: "Still waiting for feedback",
										author: { name: "Fran Perez", avatar: "/assets/avatar-5.png", status: "online" },
										createdAt: dayjs().subtract(8, "hour").subtract(6, "minute").toDate(),
									},
									{
										id: "MSG-005",
										content: "Need more information about campaigns",
										author: { name: "Jie Yan", avatar: "/assets/avatar-8.png", status: "offline" },
										createdAt: dayjs().subtract(10, "hour").subtract(18, "minute").toDate(),
									},
								]}
							/>
						</Grid> */}
						{/* <Grid
							size={{
								md: 4,
								xs: 12,
							}}
						>
							<Events
								events={[
									{
										id: "EV-004",
										title: "Meeting with partners",
										description: "17:00 to 18:00",
										createdAt: dayjs().add(1, "day").toDate(),
									},
									{
										id: "EV-003",
										title: "Interview with Jonas",
										description: "15:30 to 16:45",
										createdAt: dayjs().add(4, "day").toDate(),
									},
									{
										id: "EV-002",
										title: "Doctor's appointment",
										description: "12:30 to 15:30",
										createdAt: dayjs().add(4, "day").toDate(),
									},
									{
										id: "EV-001",
										title: "Weekly meeting",
										description: "09:00 to 09:30",
										createdAt: dayjs().add(7, "day").toDate(),
									},
								]}
							/>
						</Grid> */}
						{/* <Grid
							size={{
								md: 4,
								xs: 12,
							}}
						>
							<AppLimits usage={80} />
						</Grid> */}
						{/* <Grid
							size={{
								md: 4,
								xs: 12,
							}}
						>
							<HelperWidget
								action={
									<Button color="secondary" endIcon={<ArrowRightIcon />} size="small">
										Search jobs
									</Button>
								}
								description="Search for jobs that match your skills and apply to them directly."
								icon={BriefcaseIcon}
								label="Jobs"
								title="Find your dream job"
							/>
						</Grid>
						<Grid
							size={{
								md: 4,
								xs: 12,
							}}
						>
							<HelperWidget
								action={
									<Button color="secondary" endIcon={<ArrowRightIcon />} size="small">
										Help center
									</Button>
								}
								description="Find answers to your questions and get in touch with our team."
								icon={InfoIcon}
								label="Help center"
								title="Need help figuring things out?"
							/>
						</Grid>
						<Grid
							size={{
								md: 4,
								xs: 12,
							}}
						>
							<HelperWidget
								action={
									<Button color="secondary" endIcon={<ArrowRightIcon />} size="small">
										Documentation
									</Button>
								}
								description="Learn how to get started with our product and make the most of it."
								icon={FileCodeIcon}
								label="Documentation"
								title="Explore documentation"
							/>
						</Grid> */}
					</Grid>
				</Stack>
			</Box>
		</React.Fragment>
	);
}
