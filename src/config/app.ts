import { AuthStrategy } from "@/lib/auth-strategy";
import { LogLevel } from "@/lib/logger";
import type { PrimaryColor } from "@/styles/theme/types";

export interface AppConfig {
	name: string;
	description: string;
	// Overriden by Settings Context.
	direction: "ltr" | "rtl";
	// Overriden by Settings Context.
	language: string;
	// Overriden by Settings Context.
	theme: "light" | "dark" | "system";
	themeColor: string;
	// Overriden by Settings Context.
	primaryColor: PrimaryColor;
	logLevel: keyof typeof LogLevel;
	authStrategy: keyof typeof AuthStrategy;
}

export const appConfig: AppConfig = {
	name: import.meta.env.VITE_APP_NAME || "Complete Logistics System",
	description: "Logistics and shipping management platform",
	direction: "ltr",
	language: "en",
	theme: "light",
	themeColor: "#0B4EA2", // Complete Blue
	primaryColor: "royalBlue", // Closest to Complete Blue in the existing palette
	logLevel: (import.meta.env.VITE_LOG_LEVEL as keyof typeof LogLevel) || LogLevel.ALL,
	authStrategy: (import.meta.env.VITE_AUTH_STRATEGY as keyof typeof AuthStrategy) || AuthStrategy.NONE,
};
