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

// Helper function to create nav items as a flat list (no groups) per approved structure
const createNavItems = () => {
	const items: NavItemConfig[] = [];

	// 1. Dashboard
	items.push({ key: "dashboard", title: "Dashboard", href: "/dashboard", icon: "house" });

	// 2. Warehouse
	if (featureFlags.SHOW_WAREHOUSE) {
		items.push({ key: "warehouse", title: "Warehouse", href: paths.warehouse, icon: "kanban" }, { key: "screen-0", title: "Screen 0: Product Master", href: paths.warehouseScreens.screen0, icon: "file-csv", roles: ["CSE"] }, { key: "screen-0b", title: "Screen 0B: Product Maintenance", href: paths.warehouseScreens.screen0b, icon: "pencil", roles: ["CSE"] }, { key: "screen-1", title: "Screen 1: Receiving Order", href: paths.warehouseScreens.screen1, icon: "inbox", roles: ["CSE"] }, { key: "screen-2", title: "Screen 2: Receiving Summary", href: paths.warehouseScreens.screen2, icon: "check-circle", roles: ["CSE"] }, { key: "screen-3", title: "Screen 3: Shipping Order", href: paths.warehouseScreens.screen3, icon: "package", roles: ["CSE"] }, { key: "screen-4", title: "Screen 4: Register Container", href: paths.warehouseScreens.screen4, icon: "package", roles: ["CSE"] }, { key: "screen-5", title: "Screen 5: Pending Receipts", href: paths.warehouseScreens.screen5, icon: "list", roles: ["WH"] }, { key: "screen-6", title: "Screen 6: Container Photos", href: paths.warehouseScreens.screen6, icon: "camera", roles: ["WH"] }, { key: "screen-7", title: "Screen 7: Pallet Tallying", href: paths.warehouseScreens.screen7, icon: "stack", roles: ["WH"] }, { key: "screen-8", title: "Screen 8: Put-Away Assignment", href: paths.warehouseScreens.screen8, icon: "cube", roles: ["WH"] }, { key: "screen-9", title: "Screen 9: Pending Orders", href: paths.warehouseScreens.screen9, icon: "list-checks", roles: ["WH"] }, { key: "screen-10", title: "Screen 10: Pick Pallets", href: paths.warehouseScreens.screen10, icon: "hand-picking", roles: ["WH"] });
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
