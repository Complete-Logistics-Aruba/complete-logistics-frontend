import React, { useMemo } from "react";

import { NavItemConfig } from "@/types/nav";
import { useAuth } from "@/lib/auth/auth-context";

interface RoleBasedNavigationProps {
	children: (navItems: NavItemConfig[]) => React.ReactNode;
	navItems: NavItemConfig[];
}

export function RoleBasedNavigation({ children, navItems }: RoleBasedNavigationProps) {
	const { user } = useAuth();
	const isAdmin = user?.roles?.includes("Admin");

	// Filter navigation items based on user role
	const filteredNavItems = useMemo(() => {
		return navItems.map((section) => {
			// For each section, filter the items
			const filteredItems = section.items?.filter((item) => {
				// Hide Admin item for non-admin users
				if (item.key === "admin" && !isAdmin) {
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
	}, [navItems, isAdmin]);

	return <>{children(filteredNavItems)}</>;
}
