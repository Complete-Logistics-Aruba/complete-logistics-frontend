/**
 * useAuth Hook
 *
 * React hook for authentication state management.
 * Provides access to current user, login/logout, and loading states.
 *
 * @module lib/auth/useAuth
 */

import { useEffect, useState } from "react";

import type { User } from "../../types/domain";
import { wmsApi } from "../api";

/**
 * Auth state
 */
export interface AuthState {
	user: User | null;
	isLoading: boolean;
	error: string | null;
}

/**
 * useAuth Hook
 *
 * Manages authentication state and provides login/logout functions.
 *
 * @returns Auth state and functions
 *
 * @example
 * ```tsx
 * const { user, isLoading, login, logout } = useAuth();
 *
 * if (isLoading) return <div>Loading...</div>;
 *
 * if (!user) {
 *   return <LoginForm onLogin={login} />;
 * }
 *
 * return <Dashboard user={user} onLogout={logout} />;
 * ```
 */
export function useAuth() {
	const [state, setState] = useState<AuthState>({
		user: null,
		isLoading: true,
		error: null,
	});

	// Check if user is already logged in on mount
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const user = await wmsApi.auth.getCurrentUser();
				setState({
					user,
					isLoading: false,
					error: null,
				});
			} catch (error) {
				setState({
					user: null,
					isLoading: false,
					error: error instanceof Error ? error.message : "Failed to check auth",
				});
			}
		};

		checkAuth();
	}, []);

	/**
	 * Login user
	 *
	 * @param email - User email
	 * @param password - User password
	 * @throws Error if login fails
	 */
	const login = async (email: string, password: string): Promise<void> => {
		setState((prev) => ({ ...prev, isLoading: true, error: null }));
		try {
			const user = await wmsApi.auth.login(email, password);
			setState({
				user,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			setState({
				user: null,
				isLoading: false,
				error: error instanceof Error ? error.message : "Login failed",
			});
			throw error;
		}
	};

	/**
	 * Logout user
	 */
	const logout = async (): Promise<void> => {
		setState((prev) => ({ ...prev, isLoading: true }));
		try {
			await wmsApi.auth.logout();
			setState({
				user: null,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			setState({
				user: null,
				isLoading: false,
				error: error instanceof Error ? error.message : "Logout failed",
			});
			throw error;
		}
	};

	return {
		...state,
		login,
		logout,
	};
}
