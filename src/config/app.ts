import { AuthStrategy } from "@/lib/auth-strategy";
import { LogLevel } from "@/lib/logger";
import type { PrimaryColor } from "@/styles/theme/types";

/**
 * Application Configuration
 *
 * Reads environment variables and provides type-safe config object.
 * Validates that all required variables are present.
 *
 * @module config/app
 */

export interface AppConfig {
	// App identity
	name: string;
	description: string;
	envName: "local" | "staging" | "prod";

	// UI settings (overridden by Settings Context)
	direction: "ltr" | "rtl";
	language: string;
	theme: "light" | "dark" | "system";
	themeColor: string;
	primaryColor: PrimaryColor;

	// Logging & auth
	logLevel: keyof typeof LogLevel;
	authStrategy: keyof typeof AuthStrategy;

	// Supabase configuration
	supabaseUrl: string;
	supabaseAnonKey: string;

	// Email configuration
	receivingEmailTo: string;
	shippingEmailTo: string;

	// API configuration
	apiUrl: string;
}

/**
 * Validate required environment variables
 *
 * @throws Error if required variables are missing
 */
function validateEnvVars(): void {
	const required = [
		"VITE_APP_NAME",
		"VITE_ENV_NAME",
		"VITE_SUPABASE_URL",
		"VITE_SUPABASE_ANON_KEY",
		"VITE_RECEIVING_EMAIL_TO",
		"VITE_SHIPPING_EMAIL_TO",
	];

	const missing = required.filter((key) => !import.meta.env[key]);

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}
}

// Validate on module load
validateEnvVars();

/**
 * Application configuration object
 *
 * Reads from environment variables with sensible defaults.
 * All values are type-safe and validated at runtime.
 */
export const appConfig: AppConfig = {
	// App identity
	name: import.meta.env.VITE_APP_NAME || "Complete Logistics System",
	description: "3PL Warehouse Management System",
	envName: (import.meta.env.VITE_ENV_NAME as "local" | "staging" | "prod") || "local",

	// UI settings
	direction: "ltr",
	language: "en",
	theme: "light",
	themeColor: "#0B4EA2", // Complete Blue
	primaryColor: "royalBlue", // Closest to Complete Blue in the existing palette

	// Logging & auth
	logLevel: (import.meta.env.VITE_LOG_LEVEL as keyof typeof LogLevel) || LogLevel.ALL,
	authStrategy: (import.meta.env.VITE_AUTH_STRATEGY as keyof typeof AuthStrategy) || AuthStrategy.NONE,

	// Supabase configuration
	supabaseUrl: import.meta.env.VITE_SUPABASE_URL!,
	supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,

	// Email configuration
	receivingEmailTo: import.meta.env.VITE_RECEIVING_EMAIL_TO!,
	shippingEmailTo: import.meta.env.VITE_SHIPPING_EMAIL_TO!,

	// API configuration
	apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
};
