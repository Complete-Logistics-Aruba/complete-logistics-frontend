/* eslint-disable unicorn/filename-case */
/**
 * Protected Route Component
 *
 * Wraps routes that require authentication.
 * Redirects unauthenticated users to login page.
 * Handles missing/invalid roles.
 *
 * @module components/core/ProtectedRoute
 */

import React, { ReactNode } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
	children: ReactNode;
	requiredRole?: "Customer Service" | "Warehouse" | "Admin";
}

/**
 * ProtectedRoute Component
 *
 * Checks authentication status and role before rendering children.
 * Shows loading spinner while checking auth status.
 * Redirects to login if not authenticated.
 * Redirects to error page if role is missing or doesn't match.
 *
 * @param children - Components to render if authorized
 * @param requiredRole - Optional role requirement
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
	const { user, isLoading } = useAuth();

	// Show loading spinner while checking auth
	if (isLoading) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "100vh",
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	// Redirect to login if not authenticated
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	// Check if user has required role
	if (requiredRole && user.role !== requiredRole) {
		return <Navigate to="/error/unauthorized" replace />;
	}

	// Check if user has any role
	if (!user.role) {
		return <Navigate to="/error/no-role" replace />;
	}

	// User is authenticated and authorized
	return <>{children}</>;
}

export default ProtectedRoute;
