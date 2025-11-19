import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import { routes } from "@/routes";
import { Root } from "@/root";
import { ScrollRestoration } from "@/components/core/scroll-restoration";

// Stage 2: Using real Supabase auth and API
// Mock Service Worker (MSW) is completely disabled
// All data comes from real Supabase backend

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
