import React, { useMemo } from "react";

import { NavItemConfig } from "@/types/nav";
import { useAuth } from "@/lib/auth/auth-context";

interface RoleBasedNavigationProps {
	children: (navItems: NavItemConfig[]) => React.ReactNode;
	navItems: NavItemConfig[];
}

export function RoleBasedNavigation({ children, navItems }: RoleBasedNavigationProps) {
	const { user } = useAuth();
	const userRole = user?.role;

	// Filter navigation items based on user role
	const filteredNavItems = useMemo(() => {
		return navItems.map((section) => {
			// For each section, filter the items
			const filteredItems = section.items?.filter((item) => {
				// If item has roles specified, check if user's role is in the list
				if (item.roles && item.roles.length > 0) {
					return item.roles.includes(userRole || "");
				}
				// Hide Admin item for non-admin users (legacy support)
				if (item.key === "admin" && userRole !== "Admin") {
					return false;
				}
				return true;
			});

			// Return the section with filtered items
			return {
				...section,
				items: filteredItems,
			};
		});
	}, [navItems, userRole]);

	return <>{children(filteredNavItems)}</>;
}
