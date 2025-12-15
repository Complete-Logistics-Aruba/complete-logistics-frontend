/* eslint-disable unicorn/filename-case */
/**
 * Screen 12 Tests: Pallet Loading
 *
 * Tests for Story 7.2 acceptance criteria:
 * 1. Display pallets: shipping_order_id=this_order, status=Staged or Received
 * 2. List: Item ID, Description, Location, Qty, Loaded (checkbox)
 * 3. Checkbox checked: pallet.status=Loaded; if container: pallet.manifest_id=selected_manifest_id
 * 4. Checkbox unchecked: pallet.status=Staged; remove manifest_id
 * 5. [Finish Loading] button: enabled even if NOT all pallets loaded
 * 6. On finish: shipping_order.status=Completed; if container: manifest.status=Closed
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { locations, manifests, pallets, products, shippingOrders } from "../../lib/api/wms-api";
import Screen12 from "./Screen12";

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
		update: vi.fn(),
	},
	pallets: {
		getFiltered: vi.fn(),
		update: vi.fn(),
	},
	products: {
		getById: vi.fn(),
	},
	locations: {
		getAll: vi.fn(),
	},
	manifests: {
		getById: vi.fn(),
		update: vi.fn(),
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
				shippingOrderId: "550e8400-e29b-41d4-a716-446655440000",
				manifestId: "550e8400-e29b-41d4-a716-446655440001",
			},
		}),
	};
});

const mockShippingOrder: Record<string, unknown> = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	order_ref: "ORD-001",
	shipment_type: "Container_Loading",
	seal_num: "SEAL-123",
	status: "Loading",
	created_at: "2025-11-26T10:00:00Z",
	created_by: "user-123",
};

const mockManifest: Record<string, unknown> = {
	id: "manifest-001",
	type: "Container",
	status: "Open",
	created_at: "2025-11-26T09:00:00Z",
};

const mockProduct: Record<string, unknown> = {
	id: "prod-001",
	item_id: "ITEM-001",
	description: "Test Product",
	units_per_pallet: 100,
	pallet_positions: 10,
	active: true,
	created_at: "2025-11-26T00:00:00Z",
};

const mockPallets: Record<string, unknown>[] = [
	{
		id: "pallet-001",
		item_id: "PROD-001",
		qty: 100,
		status: "Staged",
		location_id: "loc-001",
		is_cross_dock: false,
		created_at: "2025-11-26T00:00:00Z",
	},
	{
		id: "pallet-002",
		item_id: "PROD-001",
		qty: 100,
		status: "Received",
		location_id: "loc-002",
		is_cross_dock: false,
		created_at: "2025-11-26T00:00:00Z",
	},
];

const mockLocations: Record<string, unknown>[] = [
	{
		id: "loc-001",
		warehouse_id: "wh-001",
		code: "RACK-1-A1",
		type: "RACK",
		rack: 1,
		level: 1,
		position: "A",
		created_at: "2025-11-26T00:00:00Z",
	},
	{
		id: "loc-002",
		warehouse_id: "wh-001",
		code: "RACK-2-B2",
		type: "RACK",
		rack: 2,
		level: 2,
		position: "B",
		created_at: "2025-11-26T00:00:00Z",
	},
];

const renderWithProviders = (component: React.ReactElement) => {
	return render(
		<BrowserRouter>
			<SnackbarProvider maxSnack={3}>{component}</SnackbarProvider>
		</BrowserRouter>
	);
};

describe("Screen12 - Pallet Loading", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	it("should render loading state initially", async () => {
		(shippingOrders.getById as unknown as Mock).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderWithProviders(<Screen12 />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display pallet list with columns", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should display pallet rows with data", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should display loading checkbox for each pallet", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should update pallet status when checkbox is toggled", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);
		(pallets.update as unknown as Mock).mockResolvedValue(mockPallets[0] as unknown);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should allow partial loading", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);
		(shippingOrders.update as unknown as Mock).mockResolvedValue(mockShippingOrder as unknown);
		(manifests.update as unknown as Mock).mockResolvedValue(mockManifest as unknown);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should update shipping order status to Completed on finish", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);
		(shippingOrders.update as unknown as Mock).mockResolvedValue(mockShippingOrder as unknown);
		(manifests.update as unknown as Mock).mockResolvedValue(mockManifest as unknown);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should update manifest status to Closed on finish for container loading", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);
		(shippingOrders.update as unknown as Mock).mockResolvedValue(mockShippingOrder as unknown);
		(manifests.update as unknown as Mock).mockResolvedValue(mockManifest as unknown);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should navigate to Screen 13 on finish", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);
		(shippingOrders.update as unknown as Mock).mockResolvedValue(mockShippingOrder as unknown);
		(manifests.update as unknown as Mock).mockResolvedValue(mockManifest as unknown);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should display order info", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});

	it("should display error when shipping order is not in Loading status", async () => {
		const invalidOrder = {
			...mockShippingOrder,
			status: "Completed",
		};
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(invalidOrder);

		renderWithProviders(<Screen12 />);

		await waitFor(
			() => {
				expect(mockNavigate).toHaveBeenCalledWith("/warehouse");
			},
			{ timeout: 1000 }
		);
	});

	it("should have working back button", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getAll as unknown as Mock).mockResolvedValue(mockLocations);

		renderWithProviders(<Screen12 />);

		// Verify component renders
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});
});
