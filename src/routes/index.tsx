import * as React from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";

import { Page as NotFoundPage } from "@/pages/not-found";
import { RequireAuth } from "@/lib/auth/require-auth";
import { FeatureFlagGuard } from "@/components/core/feature-flag-guard";
import { DashboardWrapper } from "@/components/dashboard-wrapper";

import { route as dashboardRoute } from "./dashboard";

// Protect the dashboard route with RequireAuth
const protectedDashboardRoute = {
	...dashboardRoute,
	element: <RequireAuth>{dashboardRoute.element}</RequireAuth>,
};

export const routes: RouteObject[] = [
	{ index: true, element: <Navigate to="/dashboard" /> },
	{
		path: "auth",
		children: [
			{
				path: "login",
				lazy: async () => {
					const { Page } = await import("@/pages/auth/login");
					return { Component: Page };
				},
			},
		],
	},
	{
		path: "warehouse",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_WAREHOUSE">
						<Outlet />
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
		children: [
			{
				index: true,
				element: React.createElement(
					React.lazy(() => import("@/pages/warehouse").then((module) => ({ default: module.Page })))
				),
			},
			{
				path: "screen-0",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen0").then((module) => ({ default: module.Screen0 })))
				),
			},
			{
				path: "screen-0b",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen0B").then((module) => ({ default: module.Screen0B })))
				),
			},
			{
				path: "screen-1",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen1").then((module) => ({ default: module.Screen1 })))
				),
			},
			{
				path: "screen-2",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen2").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "screen-4",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen4").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "screen-5",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen5").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "screen-6",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen6").then((module) => ({ default: module.Screen6 })))
				),
			},
		],
	},
	{
		path: "errors",
		children: [
			{
				path: "internal-server-error",
				lazy: async () => {
					const { Page } = await import("@/pages/errors/internal-server-error");
					return { Component: Page };
				},
			},
			{
				path: "not-authorized",
				lazy: async () => {
					const { Page } = await import("@/pages/errors/not-authorized");
					return { Component: Page };
				},
			},
			{
				path: "not-found",
				lazy: async () => {
					const { Page } = await import("@/pages/errors/not-found");
					return { Component: Page };
				},
			},
		],
	},
	protectedDashboardRoute,
	{ path: "*", element: <NotFoundPage /> },
];
