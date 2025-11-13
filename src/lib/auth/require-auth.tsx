import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "./auth-context";

interface RequireAuthProps {
	children: ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return <div>Loading...</div>; // Or a proper loading component
	}

	if (!isAuthenticated) {
		// Redirect to login page without saving location state
		return <Navigate to="/auth/login" replace />;
	}

	return <>{children}</>;
};
