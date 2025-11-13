/**
 * Feature Flags Configuration
 *
 * These flags control the visibility of UI sections during Frontend Foundations.
 * Default: all current top-level pages are visible (placeholders).
 *
 * Note: Flags control visibility only; no backend or role logic yet.
 * Last updated: 2025-11-03
 */

export interface FeatureFlags {
	// Current flags (all default to true)
	SHOW_CONSOLIDATION: boolean;
	SHOW_FCL: boolean;
	SHOW_LCL: boolean;
	SHOW_AIR: boolean;
	SHOW_INVOICING: boolean;
	SHOW_WAREHOUSE: boolean;
	SHOW_BROKERAGE: boolean;
	SHOW_DOCUMENTS: boolean;
	SHOW_DATA: boolean;
	SHOW_ADMIN: boolean;

	// Future flags (planned, default off)
	ENABLE_DARK_MODE: boolean;
	ENABLE_HBL_TAB: boolean;
}

export const featureFlags: FeatureFlags = {
	// Current flags (all default to true)
	SHOW_CONSOLIDATION: true,
	SHOW_FCL: true,
	SHOW_LCL: true,
	SHOW_AIR: true,
	SHOW_INVOICING: true,
	SHOW_WAREHOUSE: true,
	SHOW_BROKERAGE: true,
	SHOW_DOCUMENTS: true,
	SHOW_DATA: true,
	SHOW_ADMIN: true,

	// Future flags (planned, default off)
	ENABLE_DARK_MODE: false,
	ENABLE_HBL_TAB: false,
};

/**
 * Helper function to check if a feature is enabled
 * @param feature The feature flag to check
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
	return featureFlags[feature] || false;
}
