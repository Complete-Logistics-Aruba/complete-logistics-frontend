import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { authClient, AuthUser } from "@/lib/api/auth-client";

interface AuthContextType {
	user: AuthUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<AuthUser>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();

	// Set up auth state listener and check initial auth status
	useEffect(() => {
		let unsubscribe: (() => void) | null = null;

		const setupAuth = async () => {
			try {
				// Check if user is already logged in
				const currentUser = await authClient.getCurrentUser();
				setUser(currentUser);

				// Listen for auth state changes
				unsubscribe = authClient.onAuthStateChange((authUser) => {
					setUser(authUser);
					// Ensure loading is false when auth state changes
					setIsLoading(false);
				});
			} catch (error) {
				console.error("Error setting up auth:", error);
				setUser(null);
			} finally {
				setIsLoading(false);
			}
		};

		setupAuth();

		// Cleanup subscription on unmount
		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, []);

	const login = async (email: string, password: string) => {
		setIsLoading(true);
		try {
			const authUser = await authClient.login(email, password);
			setUser(authUser);
			return authUser;
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		setIsLoading(true);
		try {
			await authClient.logout();
			// Don't manually set user to null - let the auth state change listener handle it
			// This prevents race conditions
			// Wait a bit for the auth state change listener to fire
			await new Promise((resolve) => setTimeout(resolve, 100));
			// Redirect to login page after logout
			navigate("/auth/login", { replace: true });
		} finally {
			setIsLoading(false);
		}
	};

	const value = {
		user,
		isAuthenticated: !!user,
		isLoading,
		login,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
