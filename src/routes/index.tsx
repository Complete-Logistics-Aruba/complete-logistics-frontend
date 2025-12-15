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
				path: "home",
				element: React.createElement(
					React.lazy(() => import("@/pages/warehouse").then((module) => ({ default: module.Page })))
				),
			},
			{
				path: "product-master",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen0").then((module) => ({ default: module.Screen0 })))
				),
			},
			{
				path: "product-maintenance",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen0B").then((module) => ({ default: module.Screen0B })))
				),
			},
			{
				path: "create-receiving-order",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen1").then((module) => ({ default: module.Screen1 })))
				),
			},
			{
				path: "receiving-summary",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen2").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "create-shipping-order",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen3").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "register-empty-container",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen4").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "pending-receipts",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen5").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "container-photos",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen6").then((module) => ({ default: module.Screen6 })))
				),
			},
			{
				path: "tally-pallets",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/screen7").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "put-away",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/screen8").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "pending-shipping-orders",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/screen9").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "pick-pallets",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen10").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "select-load-target",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen11").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "load-pallets",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen12").then((module) => ({ default: module.default })))
				),
			},
			{
				path: "shipping-summary",
				element: React.createElement(
					React.lazy(() => import("@/components/screens/Screen13").then((module) => ({ default: module.default })))
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
