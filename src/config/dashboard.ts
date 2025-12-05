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
				],
			}
		);

		// Screen 6 and Screen 7 are hidden from sidebar
		// They are only accessible through workflow navigation:
		// Screen 5 → Screen 6 (Container Photos) → Screen 7 (Tally Pallets)
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
