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
		path: "api-test",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					{React.createElement(
						React.lazy(() => import("@/pages/api-test").then((module) => ({ default: module.Page })))
					)}
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	// Main navigation routes as per ROUTING_STRUCTURE.md
	{
		path: "consolidation",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_CONSOLIDATION">
						{React.createElement(
							React.lazy(() => import("@/pages/consolidation").then((module) => ({ default: module.Page })))
						)}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "fcl",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_FCL">
						<Outlet />
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
		children: [
			{
				index: true,
				element: React.createElement(
					React.lazy(() => import("@/pages/fcl").then((module) => ({ default: module.Page })))
				),
			},
			{
				path: "new",
				element: React.createElement(
					React.lazy(() => import("@/pages/fcl/new").then((module) => ({ default: module.Page })))
				),
			},
		],
	},
	{
		path: "lcl",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_LCL">
						{React.createElement(React.lazy(() => import("@/pages/lcl").then((module) => ({ default: module.Page }))))}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "air",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_AIR">
						{React.createElement(React.lazy(() => import("@/pages/air").then((module) => ({ default: module.Page }))))}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "invoicing",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_INVOICING">
						{React.createElement(
							React.lazy(() => import("@/pages/invoicing").then((module) => ({ default: module.Page })))
						)}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "warehouse",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_WAREHOUSE">
						{React.createElement(
							React.lazy(() => import("@/pages/warehouse").then((module) => ({ default: module.Page })))
						)}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "brokerage",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_BROKERAGE">
						{React.createElement(
							React.lazy(() => import("@/pages/brokerage").then((module) => ({ default: module.Page })))
						)}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "documents",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_DOCUMENTS">
						{React.createElement(
							React.lazy(() => import("@/pages/documents").then((module) => ({ default: module.Page })))
						)}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "data",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_DATA">
						{React.createElement(React.lazy(() => import("@/pages/data").then((module) => ({ default: module.Page }))))}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
	},
	{
		path: "admin",
		element: (
			<RequireAuth>
				<DashboardWrapper>
					<FeatureFlagGuard feature="SHOW_ADMIN">
						{React.createElement(
							React.lazy(() => import("@/pages/admin").then((module) => ({ default: module.Page })))
						)}
					</FeatureFlagGuard>
				</DashboardWrapper>
			</RequireAuth>
		),
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
