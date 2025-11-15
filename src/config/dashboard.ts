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
	items.push({ key: "dashboard", title: "Dashboard", href: "/", icon: "house" });

	// 2. Consolidation
	if (featureFlags.SHOW_CONSOLIDATION) {
		items.push({ key: "consolidation", title: "Consolidation", href: paths.consolidation, icon: "cube" });
	}

	// 3. Full container (FCL)
	if (featureFlags.SHOW_FCL) {
		items.push({ key: "fcl", title: "Full container (FCL)", href: paths.fcl, icon: "cube" });
	}

	// 4. LCL
	if (featureFlags.SHOW_LCL) {
		items.push({ key: "lcl", title: "LCL", href: paths.lcl, icon: "cube" });
	}

	// 5. Air
	if (featureFlags.SHOW_AIR) {
		items.push({ key: "air", title: "Air", href: paths.air, icon: "upload" });
	}

	// 6. Invoicing
	if (featureFlags.SHOW_INVOICING) {
		items.push({ key: "invoicing", title: "Invoicing", href: paths.invoicing, icon: "receipt" });
	}

	// 7. Warehouse
	if (featureFlags.SHOW_WAREHOUSE) {
		items.push({ key: "warehouse", title: "Warehouse", href: paths.warehouse, icon: "kanban" });
	}

	// 8. Brokerage
	if (featureFlags.SHOW_BROKERAGE) {
		items.push({ key: "brokerage", title: "Brokerage", href: paths.brokerage, icon: "briefcase" });
	}

	// 9. Documents
	if (featureFlags.SHOW_DOCUMENTS) {
		items.push({ key: "documents", title: "Documents", href: paths.documents, icon: "file" });
	}

	// 10. Data Management
	if (featureFlags.SHOW_DATA) {
		items.push({ key: "data", title: "Data Management", href: paths.data, icon: "chart-pie" });
	}

	// 11. Admin
	if (featureFlags.SHOW_ADMIN) {
		items.push({ key: "admin", title: "Admin", href: paths.admin, icon: "sliders-horizontal" });
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
