import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import { routes } from "@/routes";
import { Root } from "@/root";
import { ScrollRestoration } from "@/components/core/scroll-restoration";

// Initialize MSW only in development environment
if (import.meta.env.DEV) {
	const initMocks = async () => {
		try {
			const { worker } = await import("@/mocks/browser");
			await worker.start({
				// Show all requests in browser console
				onUnhandledRequest: "warn", // Changed to warn to see unhandled requests
				serviceWorker: {
					url: "/mockServiceWorker.js",
				},
			});
			console.log("[MSW] Mock Service Worker started successfully");
		} catch (error) {
			console.error("[MSW] Failed to start Mock Service Worker:", error);
		}
	};

	// Wait for MSW to initialize before rendering
	initMocks();
}

const root = createRoot(document.querySelector("#root")!);

const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<Root>
				<ScrollRestoration />
				<Outlet />
			</Root>
		),
		children: [...routes],
	},
]);

root.render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);
