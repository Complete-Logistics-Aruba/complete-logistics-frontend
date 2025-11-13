import React from "react";

import { Layout as DashboardLayout } from "@/components/dashboard/layout/layout";

interface DashboardWrapperProps {
	children: React.ReactNode;
}

export const DashboardWrapper: React.FC<DashboardWrapperProps> = ({ children }) => {
	return <DashboardLayout>{children}</DashboardLayout>;
};
