import type { NavItemConfig } from "@/types/nav";
import { featureFlags } from "@/config/feature-flags";
import { paths } from "@/paths";

// NOTE: We did not use React Components for Icons, because
//  you may want to get the config from the server.

// NOTE: First level of navItem elements are groups.

export interface DashboardConfig {
	// Overriden by Settings Context.
	layout: "horizontal" | "vertical";
	// Overriden by Settings Context.
	navColor: "blend_in" | "discrete" | "evident";
	navItems: NavItemConfig[];
}

// Helper function to create nav items per approved structure
// Milestone 1: CSE (collapsible menus) + WH (flat menu) + Admin (both)
const createNavItems = () => {
	const items: NavItemConfig[] = [];

	// 1. Dashboard / Home (role-based label)
	items.push(
		{
			key: "dashboard",
			title: "Dashboard",
			href: "/dashboard",
			roles: ["Customer Service", "Admin"],
		},
		{
			key: "home",
			title: "Home",
			href: "/warehouse/home",
			roles: ["Warehouse"],
		}
	);

	if (featureFlags.SHOW_WAREHOUSE) {
		// ========================================
		// CUSTOMER SERVICE ROLE (CSE)
		// ========================================
		// Collapsible "Inventory" menu for Product Master
		// ========================================
		// WAREHOUSE ROLE (WH)
		// ========================================
		// ========================================
		// ADMIN & OPS MANAGER ROLE (SUPERUSER)
		// ========================================
		items.push(
			{
				key: "inventory",
				title: "Inventory",
				icon: "package",
				roles: ["Customer Service", "Admin"],
				items: [
					{
						key: "screen-0",
						title: "Product Master",
						href: paths.warehouseScreens.screen0,
						icon: "file-csv",
					},
					{
						key: "screen-0b",
						title: "Product Maintenance",
						href: paths.warehouseScreens.screen0b,
						icon: "pencil",
					},
					{
						key: "screen-14",
						title: "Billing Report",
						href: paths.warehouseScreens.screen14,
						icon: "chart-bar",
					},
					{
						key: "screen-15",
						title: "Inventory Adjustments",
						href: paths.warehouseScreens.screen15,
						icon: "trash",
					},
				],
			},
			{
				key: "inbound-cse",
				title: "Inbound",
				icon: "inbox",
				roles: ["Customer Service", "Admin"],
				items: [
					{
						key: "screen-1",
						title: "Create Receiving Order",
						href: paths.warehouseScreens.screen1,
						icon: "plus",
					},
					{
						key: "screen-2",
						title: "Receiving Summary",
						href: paths.warehouseScreens.screen2,
						icon: "check-circle",
					},
				],
			},
			{
				key: "outbound-cse",
				title: "Outbound",
				icon: "arrow-up-right",
				roles: ["Customer Service", "Admin"],
				items: [
					{
						key: "screen-3",
						title: "Create Shipping Order",
						href: paths.warehouseScreens.screen3,
						icon: "plus",
					},
					{
						key: "screen-4",
						title: "Register Container",
						href: paths.warehouseScreens.screen4,
						icon: "box",
					},
					{
						key: "screen-13",
						title: "Manifests",
						href: paths.warehouseScreens.screen13,
						icon: "file-text",
					},
				],
			},
			{
				key: "inbound-wh",
				title: "Inbound",
				icon: "inbox",
				roles: ["Warehouse"],
				items: [
					{
						key: "screen-5",
						title: "Pending Receipts",
						href: paths.warehouseScreens.screen5,
						icon: "inbox",
					},
					{
						key: "screen-6",
						title: "Container Photos",
						href: paths.warehouseScreens.screen6,
						icon: "image",
					},
					{
						key: "screen-7",
						title: "Tally Pallets",
						href: paths.warehouseScreens.screen7,
						icon: "package",
					},
					{
						key: "screen-8",
						title: "Put-Away",
						href: paths.warehouseScreens.screen8,
						icon: "arrow-down-left",
					},
				],
			},
			{
				key: "outbound-wh",
				title: "Outbound",
				icon: "arrow-up-right",
				roles: ["Warehouse"],
				items: [
					{
						key: "screen-9",
						title: "Pending Shipping Orders",
						href: paths.warehouseScreens.screen9,
						icon: "inbox",
					},
					{
						key: "screen-10",
						title: "Pick Pallets",
						href: paths.warehouseScreens.screen10,
						icon: "hand",
					},
					{
						key: "screen-11",
						title: "Load Target Selection",
						href: paths.warehouseScreens.screen11,
						icon: "target",
					},
					{
						key: "screen-12",
						title: "Load Pallets",
						href: paths.warehouseScreens.screen12,
					},
				],
			},
			{
				key: "floor-operations",
				title: "Floor Operations",
				icon: "warehouse",
				roles: ["Admin"],
				items: [
					{
						key: "screen-5-admin",
						title: "Pending Receipts",
						href: paths.warehouseScreens.screen5,
						icon: "inbox",
					},
					{
						key: "screen-6-admin",
						title: "Container Photos",
						href: paths.warehouseScreens.screen6,
						icon: "image",
					},
					{
						key: "screen-7-admin",
						title: "Tally Pallets",
						href: paths.warehouseScreens.screen7,
						icon: "package",
					},
					{
						key: "screen-8-admin",
						title: "Put-Away",
						href: paths.warehouseScreens.screen8,
						icon: "arrow-down-left",
					},
					{
						key: "screen-9-admin",
						title: "Pending Shipping Orders",
						href: paths.warehouseScreens.screen9,
						icon: "inbox",
					},
					{
						key: "screen-10-admin",
						title: "Pick Pallets",
						href: paths.warehouseScreens.screen10,
						icon: "hand",
					},
					{
						key: "screen-11-admin",
						title: "Load Target Selection",
						href: paths.warehouseScreens.screen11,
						icon: "target",
					},
					{
						key: "screen-12-admin",
						title: "Load Pallets",
						href: paths.warehouseScreens.screen12,
						icon: "truck",
					},
				],
			}
		);

		// Screens 6, 7, 8 are also accessible through workflow navigation
		// Screen 5 → Screen 6 (Container Photos) → Screen 7 (Tally Pallets) → Screen 8 (Put-Away)
		// Screens 10, 11, 12 are also accessible through workflow navigation
		// Screen 9 → Screen 10 (Pick Pallets) → Screen 11 (Load Target) → Screen 12 (Load Pallets)
	}

	return items;
};

export const dashboardConfig = {
	layout: "vertical",
	navColor: "evident",
	navItems: [
		{
			key: "main",
			items: createNavItems(),
		},
	],
} satisfies DashboardConfig;
