import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Initialize Supabase client (only place in the app that imports Supabase)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * User profile type - extends Supabase auth user with profile data
 */
export interface AuthUser {
	id: string;
	email: string;
	name: string;
	role: string;
}

/**
 * Auth client wrapper - all Supabase auth logic is isolated here
 * Components must use this wrapper instead of importing Supabase directly
 */
export const authClient = {
	/**
	 * Sign in with email and password
	 * @param email User email
	 * @param password User password
	 * @returns User data with role from profiles table
	 */
	async login(email: string, password: string): Promise<AuthUser> {
		try {
			// Sign in with Supabase Auth
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				console.error("Supabase login error:", error.message);
				throw new Error(error.message);
			}

			if (!data.user) {
				throw new Error("No user returned from login");
			}

			// Fetch user profile with role from profiles table
			const user = await this.getCurrentUser();
			if (!user) {
				throw new Error("Failed to fetch user profile");
			}

			// Store user in localStorage for persistence
			localStorage.setItem("auth_user", JSON.stringify(user));

			return user;
		} catch (error) {
			console.error("Login failed:", error);
			throw error;
		}
	},

	/**
	 * Sign out the current user
	 */
	async logout(): Promise<void> {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				console.error("Supabase logout error:", error.message);
				throw new Error(error.message);
			}

			// Clear user from localStorage
			localStorage.removeItem("auth_user");
		} catch (error) {
			console.error("Logout failed:", error);
			throw error;
		}
	},

	/**
	 * Get current authenticated user with profile data
	 * Fetches from both auth.users and profiles table
	 * @returns User with role, or null if not authenticated
	 */
	async getCurrentUser(): Promise<AuthUser | null> {
		try {
			// Get current session from Supabase
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

			if (sessionError || !sessionData.session) {
				console.log("No active session");
				return null;
			}

			const authUser = sessionData.session.user;

			// Fetch user profile from profiles table
			const { data: profileData, error: profileError } = await supabase
				.from("profiles")
				.select("id, name, email, role")
				.eq("id", authUser.id)
				.single();

			if (profileError) {
				console.error("Error fetching user profile:", profileError.message);
				return null;
			}

			if (!profileData) {
				console.error("User profile not found");
				return null;
			}

			const user: AuthUser = {
				id: profileData.id,
				email: profileData.email,
				name: profileData.name,
				role: profileData.role,
			};

			return user;
		} catch (error) {
			console.error("Error getting current user:", error);
			return null;
		}
	},

	/**
	 * Get current session
	 * @returns Current Supabase session or null
	 */
	async getCurrentSession() {
		try {
			const { data, error } = await supabase.auth.getSession();
			if (error) {
				console.error("Error getting session:", error.message);
				return null;
			}
			return data.session;
		} catch (error) {
			console.error("Error getting session:", error);
			return null;
		}
	},

	/**
	 * Listen to auth state changes
	 * Calls callback whenever user logs in/out or session changes
	 * @param callback Function to call when auth state changes
	 * @returns Unsubscribe function
	 */
	onAuthStateChange(callback: (user: AuthUser | null) => void) {
		try {
			const { data } = supabase.auth.onAuthStateChange(async (event, _session) => {
				console.log("Auth state changed:", event);

				if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
					// User signed in or token refreshed - fetch full user data
					const user = await this.getCurrentUser();
					callback(user);
				} else if (event === "SIGNED_OUT") {
					// User signed out
					callback(null);
				}
			});

			// Return unsubscribe function
			return () => {
				data?.subscription.unsubscribe();
			};
		} catch (error) {
			console.error("Error setting up auth state listener:", error);
			return () => {};
		}
	},

	/**
	 * Check if user is currently authenticated
	 * @returns true if user has valid session
	 */
	async isAuthenticated(): Promise<boolean> {
		const session = await this.getCurrentSession();
		return !!session;
	},

	/**
	 * Get user from localStorage (for quick access without async call)
	 * Note: This may be stale. Use getCurrentUser() for fresh data.
	 * @returns Cached user or null
	 */
	getCachedUser(): AuthUser | null {
		try {
			const userJson = localStorage.getItem("auth_user");
			return userJson ? JSON.parse(userJson) : null;
		} catch {
			return null;
		}
	},
};
