/**
 * Supabase Client Initialization
 *
 * This module initializes the Supabase client with environment variables.
 * All Supabase operations should go through this client, which is then
 * wrapped by wmsApi.ts for component consumption.
 *
 * @module lib/auth/supabaseClient
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Initialize Supabase client
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment.
 * These must be set in .env.local, .env.staging, or .env.prod
 *
 * @throws {Error} If VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing Supabase environment variables. " + "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file"
	);
}

/**
 * Supabase client instance
 *
 * This is the single source of truth for all Supabase operations.
 * Components should NOT import this directly; use wmsApi instead.
 *
 * @type {SupabaseClient}
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
});

/**
 * Get current session
 *
 * @returns {Promise<Session | null>} Current session or null if not authenticated
 */
export async function getCurrentSession() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	return session;
}

/**
 * Get current user
 *
 * @returns {Promise<User | null>} Current user or null if not authenticated
 */
export async function getCurrentUser() {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	return user;
}

/**
 * Setup page visibility listener to handle tab switches
 *
 * When the page becomes visible after being hidden (tab switch),
 * we need to refresh the Supabase session to ensure the connection is alive.
 * This prevents hanging when making API calls after a tab switch.
 *
 * @returns Unsubscribe function
 */
export function setupPageVisibilityListener() {
	const handleVisibilityChange = async () => {
		if (document.visibilityState === "visible") {
			console.log("Page became visible - refreshing Supabase session...");
			try {
				// Refresh the session to ensure connection is alive
				// This is safe and won't cause multiple client instances
				const { data, error } = await supabase.auth.refreshSession();
				if (error) {
					console.warn("Session refresh error:", error.message);
				} else if (data.session) {
					console.log("Session refreshed successfully");
				}
			} catch (error) {
				console.error("Error refreshing session on tab visibility:", error);
			}
		}
	};

	document.addEventListener("visibilitychange", handleVisibilityChange);
	return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}
