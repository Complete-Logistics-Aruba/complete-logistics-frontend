/**
 * Supabase Client Initialization
 *
 * This module initializes the Supabase client with environment variables.
 * All Supabase operations should go through this client, which is then
 * wrapped by wmsApi.ts for component consumption.
 *
 * @module lib/auth/supabaseClient
 */

import { createClient } from '@supabase/supabase-js';

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
    'Missing Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'
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
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
