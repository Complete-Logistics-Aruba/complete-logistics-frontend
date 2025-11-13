"use client";

import * as React from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

import "@/styles/global.css";

import type { Metadata } from "@/types/metadata";
import { appConfig } from "@/config/app";
import { AuthProvider } from "@/lib/auth/auth-context";
import { getSettings as getPersistedSettings } from "@/lib/settings";
import { Analytics } from "@/components/core/analytics";
import { EnvIndicator } from "@/components/core/env-indicator";
import { ErrorBoundary } from "@/components/core/error-boundary/error-boundary";
import { I18nProvider } from "@/components/core/i18n-provider";
import { LocalizationProvider } from "@/components/core/localization-provider";
import { ToastProvider } from "@/components/core/notifications/simple-toast-provider";
import { Rtl } from "@/components/core/rtl";
import { SettingsButton } from "@/components/core/settings/settings-button";
import { SettingsProvider } from "@/components/core/settings/settings-context";
import { ThemeProvider } from "@/components/core/theme-provider";
import { FeatureFlagAdmin } from "@/components/dev/feature-flag-admin";

const metadata = { title: appConfig.name } satisfies Metadata;

export interface RootProps {
	children: React.ReactNode;
}

export function Root({ children }: RootProps): React.JSX.Element {
	const settings = getPersistedSettings();

	return (
		<HelmetProvider>
			<Helmet>
				<title>{metadata.title}</title>
				<meta content={appConfig.themeColor} name="theme-color" />
			</Helmet>
			<ErrorBoundary>
				<AuthProvider>
					<Analytics>
						<LocalizationProvider>
							<SettingsProvider settings={settings}>
								<I18nProvider>
									<Rtl>
										<ThemeProvider>
											<ToastProvider>
												{children}
												<SettingsButton />
												<EnvIndicator />
												<FeatureFlagAdmin />
											</ToastProvider>
										</ThemeProvider>
									</Rtl>
								</I18nProvider>
							</SettingsProvider>
						</LocalizationProvider>
					</Analytics>
				</AuthProvider>
			</ErrorBoundary>
		</HelmetProvider>
	);
}
