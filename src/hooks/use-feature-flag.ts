import { useMemo } from "react";

import { featureFlags, type FeatureFlags } from "@/config/feature-flags";

/**
 * Hook to check if a feature is enabled
 * @param feature The feature flag to check
 * @returns boolean indicating if the feature is enabled
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
	return useMemo(() => featureFlags[feature] || false, [feature]);
}

/**
 * Hook to check if multiple features are enabled
 * @param features Array of feature flags to check
 * @returns object with each feature name as key and boolean value
 */
export function useFeatureFlags(features: Array<keyof FeatureFlags>): Record<string, boolean> {
	return useMemo(() => {
		const result: Record<string, boolean> = {};

		for (const feature of features) {
			result[feature] = featureFlags[feature] || false;
		}

		return result;
	}, [features]);
}
