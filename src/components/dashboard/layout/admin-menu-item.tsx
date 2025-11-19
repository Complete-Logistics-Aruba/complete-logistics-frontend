import React from "react";

import type { NavItemConfig } from "@/types/nav";
import { paths } from "@/paths";
import { useAuth } from "@/lib/auth/auth-context";

interface AdminMenuItemProps {
	onItemsReady: (items: NavItemConfig[]) => void;
}

export function AdminMenuItem({ onItemsReady }: AdminMenuItemProps) {
	const { user } = useAuth();
	const isAdmin = user?.role === "Admin";

	React.useEffect(() => {
		let items: NavItemConfig[] = [];

		if (isAdmin) {
			items = [
				{
					key: "admin",
					title: "Admin",
					href: paths.admin,
					icon: "sliders-horizontal",
				},
			];
		}

		onItemsReady(items);
	}, [user, isAdmin, onItemsReady]);

	return null; // This is a logic component, no rendering
}
