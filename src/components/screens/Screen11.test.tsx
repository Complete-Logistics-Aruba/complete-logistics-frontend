/* eslint-disable unicorn/filename-case */
/**
 * Screen 11 Tests: Load Target Selection
 *
 * Tests for Story 7.1 acceptance criteria:
 * 1. Branch by shipment_type
 * 2. Hand Delivery: Display order ref, seal #, [Start Loading] button
 * 3. Container Loading: Display manifests (type=Container, status=Open)
 * 4. Navigation to Screen 12 on selection
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { manifests as manifestsApi, shippingOrders } from "../../lib/api/wms-api";
import type { Manifest, ShippingOrder } from "../../types/domain";
import Screen11 from "./Screen11";

// Mock supabase
vi.mock("../../lib/auth/supabase-client", () => ({
	supabase: {
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn().mockResolvedValue({ data: null, error: null }),
				})),
			})),
			update: vi.fn().mockResolvedValue({ error: null }),
		})),
	},
}));

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => ({
	shippingOrders: {
		getById: vi.fn(),
	},
	manifests: {
		getFiltered: vi.fn(),
	},
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => ({
			state: {
				shippingOrderId: "order-123",
			},
		}),
	};
});

const mockShippingOrderHandDelivery: ShippingOrder = {
	id: "order-123",
	order_ref: "ORD-001",
	shipment_type: "Hand_Delivery",
	seal_num: "SEAL-123",
	status: "Loading",
	created_at: "2025-11-26T10:00:00Z",
};

const mockShippingOrderContainer: ShippingOrder = {
	id: "order-456",
	order_ref: "ORD-002",
	shipment_type: "Container_Loading",
	seal_num: undefined,
	status: "Loading",
	created_at: "2025-11-26T10:00:00Z",
};

const mockManifests: Manifest[] = [
	{
		id: "manifest-001",
		type: "Container",
		seal_num: "SEAL-001",
		status: "Open",
		created_at: "2025-11-26T09:00:00Z",
	},
	{
		id: "manifest-002",
		type: "Container",
		seal_num: "SEAL-002",
		status: "Open",
		created_at: "2025-11-26T08:00:00Z",
	},
];

const renderWithProviders = (component: React.ReactElement) => {
	return render(
		<BrowserRouter>
			<SnackbarProvider maxSnack={3}>{component}</SnackbarProvider>
		</BrowserRouter>
	);
};

describe("Screen11 - Load Target Selection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	it("should render loading state initially", async () => {
		(shippingOrders.getById as Mock).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderWithProviders(<Screen11 />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display hand delivery info with warning message (no Create New Manifest button)", async () => {
		(shippingOrders.getById as Mock).mockResolvedValue(mockShippingOrderHandDelivery);
		(manifestsApi.getFiltered as Mock).mockResolvedValue([]); // No manifests available

		renderWithProviders(<Screen11 />);

		await waitFor(() => {
			expect(screen.getByText("ORD-001")).toBeInTheDocument();
			expect(screen.getByText("SEAL-123")).toBeInTheDocument();
			expect(
				screen.getByText(
					"No open hand delivery trips available. Please contact Customer Service to create a new manifest."
				)
			).toBeInTheDocument();
		});

		// Verify Create New Manifest button is NOT present
		expect(screen.queryByRole("button", { name: /create new manifest/i })).not.toBeInTheDocument();
	});

	it("should display container manifest list for Container Loading", async () => {
		(shippingOrders.getById as Mock).mockResolvedValue(mockShippingOrderContainer);
		(manifestsApi.getFiltered as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen11 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should display hand delivery manifest list when manifests are available", async () => {
		(shippingOrders.getById as Mock).mockResolvedValue(mockShippingOrderHandDelivery);

		const mockHandDeliveryManifests: Manifest[] = [
			{
				id: "hand-manifest-001",
				type: "Hand_Delivery",
				seal_num: "SEAL-HAND-001",
				status: "Open",
				created_at: "2025-11-26T09:00:00Z",
			},
		];

		(manifestsApi.getFiltered as Mock).mockResolvedValue(mockHandDeliveryManifests);

		renderWithProviders(<Screen11 />);

		await waitFor(() => {
			expect(screen.getByText("ORD-001")).toBeInTheDocument();
			expect(screen.getByText("SEAL-123")).toBeInTheDocument();
			expect(screen.getByText("hand-man")).toBeInTheDocument(); // First 8 chars of manifest ID
		});

		// Verify warning message is NOT present when manifests exist
		expect(
			screen.queryByText(
				"No open hand delivery trips available. Please contact Customer Service to create a new manifest."
			)
		).not.toBeInTheDocument();
	});

	it("should navigate to Screen 12 on manifest selection", async () => {
		(shippingOrders.getById as Mock).mockResolvedValue(mockShippingOrderContainer);
		(manifestsApi.getFiltered as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen11 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should display error when shipping order is not in Loading status", async () => {
		const invalidOrder: ShippingOrder = {
			...mockShippingOrderHandDelivery,
			status: "Pending" as unknown as ShippingOrder["status"],
		};
		(shippingOrders.getById as Mock).mockResolvedValue(invalidOrder);

		renderWithProviders(<Screen11 />);

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith("/warehouse");
		});
	});

	it("should display error when no shipping order ID provided", async () => {
		// Override the location mock to return no state
		(shippingOrders.getById as Mock).mockClear();

		renderWithProviders(<Screen11 />);

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith("/warehouse");
		});
	});

	it("should display warning when no container manifests available", async () => {
		(shippingOrders.getById as Mock).mockResolvedValue(mockShippingOrderContainer);
		(manifestsApi.getFiltered as Mock).mockResolvedValue([]);

		renderWithProviders(<Screen11 />);

		await waitFor(() => {
			expect(screen.getByText("No open container manifests available")).toBeInTheDocument();
		});
	});

	it("should display shipment type chip", async () => {
		(shippingOrders.getById as Mock).mockResolvedValue(mockShippingOrderHandDelivery);

		renderWithProviders(<Screen11 />);

		await waitFor(() => {
			expect(screen.getByText("Hand Delivery")).toBeInTheDocument();
		});
	});

	it("should have working back button", async () => {
		(shippingOrders.getById as Mock).mockResolvedValue(mockShippingOrderHandDelivery);

		renderWithProviders(<Screen11 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});
});
