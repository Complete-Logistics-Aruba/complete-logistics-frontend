import React from "react";
import { Navigate } from "react-router-dom";

import { isFeatureEnabled, type FeatureFlags } from "@/config/feature-flags";
import { Page as NotFoundPage } from "@/pages/not-found";

interface FeatureFlagGuardProps {
	feature: keyof FeatureFlags;
	children: React.ReactNode;
	fallbackPath?: string;
}

/**
 * A component that conditionally renders its children based on a feature flag.
 * If the feature is disabled, it will either redirect to the fallback path or
 * show a not found page.
 */
export const FeatureFlagGuard: React.FC<FeatureFlagGuardProps> = ({
	feature,
	children,
	fallbackPath = "/dashboard",
}) => {
	if (!isFeatureEnabled(feature)) {
		return fallbackPath ? <Navigate to={fallbackPath} /> : <NotFoundPage />;
	}

	return <>{children}</>;
};
