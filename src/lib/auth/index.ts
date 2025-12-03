/**
 * Auth Barrel Export
 *
 * Exports authentication utilities for use throughout the application.
 *
 * @module lib/auth
 */

export { supabase, getCurrentSession, getCurrentUser } from './supabase-client';
export { useAuth } from './use-auth';
export type { AuthState } from './use-auth';
