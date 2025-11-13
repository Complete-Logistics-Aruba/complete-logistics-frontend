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

// Helper function to create nav items conditionally based on feature flags
const createNavItems = () => {
	const items: NavItemConfig[] = [{ key: "dashboard", title: "Dashboard", href: "/", icon: "house" }];

	// Shipping menu group with sub-items
	const shippingItems: NavItemConfig[] = [];

	if (featureFlags.SHOW_CONSOLIDATION) {
		shippingItems.push({ key: "consolidation", title: "Consolidation", href: paths.consolidation, icon: "package" });
	}

	if (featureFlags.SHOW_FCL) {
		shippingItems.push({ key: "fcl", title: "FCL", href: paths.fcl, icon: "package" });
	}

	if (featureFlags.SHOW_LCL) {
		shippingItems.push({ key: "lcl", title: "LCL", href: paths.lcl, icon: "package" });
	}

	if (featureFlags.SHOW_AIR) {
		shippingItems.push({ key: "air", title: "Air", href: paths.air, icon: "plane" });
	}

	// Only add the shipping group if it has items
	if (shippingItems.length > 0) {
		items.push({
			key: "shipping",
			title: "Shipping",
			icon: "truck",
			items: shippingItems,
		});
	}

	// Operations menu group with sub-items
	const operationsItems: NavItemConfig[] = [];

	if (featureFlags.SHOW_WAREHOUSE) {
		operationsItems.push({ key: "warehouse", title: "Warehouse", href: paths.warehouse, icon: "warehouse" });
	}

	if (featureFlags.SHOW_BROKERAGE) {
		operationsItems.push({ key: "brokerage", title: "Brokerage", href: paths.brokerage, icon: "handshake" });
	}

	// Only add the operations group if it has items
	if (operationsItems.length > 0) {
		items.push({
			key: "operations",
			title: "Operations",
			icon: "gear",
			items: operationsItems,
		});
	}

	// Business menu group with sub-items
	const businessItems: NavItemConfig[] = [];

	if (featureFlags.SHOW_INVOICING) {
		businessItems.push({ key: "invoicing", title: "Invoicing", href: paths.invoicing, icon: "currency-dollar" });
	}

	if (featureFlags.SHOW_DOCUMENTS) {
		businessItems.push({ key: "documents", title: "Documents", href: paths.documents, icon: "file-text" });
	}

	if (featureFlags.SHOW_DATA) {
		businessItems.push({ key: "data", title: "Data Management", href: paths.data, icon: "database" });
	}

	// Only add the business group if it has items
	if (businessItems.length > 0) {
		items.push({
			key: "business",
			title: "Business",
			icon: "briefcase",
			items: businessItems,
		});
	}

	// Add Admin as a standalone item for special permissions
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
		{
			key: "testing",
			title: "Testing",
			items: [
				{
					key: "api-test",
					title: "API Testing",
					icon: "brackets-curly",
					items: [
						{ key: "api-test-page", title: "API Test Page", href: paths.dashboard.apiTest, icon: "brackets-curly" },
					],
				},
			],
		},
	],
} satisfies DashboardConfig;
