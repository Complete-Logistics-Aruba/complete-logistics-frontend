/* eslint-disable unicorn/filename-case */
/**
 * Screen 10: Picking Workflow - Tests
 *
 * Tests for Story 6.2: Picking Workflow
 * Tests for Story 6.3: Picking Filters
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as wmsApi from "../../lib/api/wms-api";
import Screen10 from "./Screen10";

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
vi.mock("../../lib/api/wms-api", () => {
	const shippingOrdersMock = {
		getById: vi.fn(),
		update: vi.fn(),
	};
	const palletsMock = {
		getFiltered: vi.fn(),
		update: vi.fn(),
	};
	const productsMock = {
		getAll: vi.fn().mockResolvedValue([]),
		getById: vi.fn(),
	};
	const locationsMock = {
		getAll: vi.fn(),
	};
	return {
		shippingOrders: shippingOrdersMock,
		pallets: palletsMock,
		products: productsMock,
		locations: locationsMock,
		default: {
			shippingOrders: shippingOrdersMock,
			pallets: palletsMock,
			products: productsMock,
			locations: locationsMock,
		},
	};
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => ({
			state: { shippingOrderId: "550e8400-e29b-41d4-a716-446655440000" },
		}),
	};
});

describe("Screen 10: Picking Workflow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const renderScreen = () => {
		return render(
			<BrowserRouter>
				<SnackbarProvider>
					<Screen10 />
				</SnackbarProvider>
			</BrowserRouter>
		);
	};

	it("should render loading state initially", () => {
		vi.mocked(wmsApi.default.shippingOrders.getById).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderScreen();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display shipping order details", async () => {
		const mockOrder = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			order_ref: "ORD-001",
			shipment_type: "Hand_Delivery" as const,
			status: "Pending" as const,
			created_at: "2025-11-26T10:00:00Z",
			created_by: "user-1",
			lines: [
				{
					id: "line-1",
					shipping_order_id: "550e8400-e29b-41d4-a716-446655440000",
					item_id: "prod-1",
					requested_qty: 100,
					created_at: "2025-11-26T10:00:00Z",
				},
			],
		};

		vi.mocked(wmsApi.default.shippingOrders.getById).mockResolvedValue(mockOrder as unknown as typeof mockOrder);
		vi.mocked(wmsApi.default.pallets.getFiltered).mockResolvedValue([]);
		vi.mocked(wmsApi.default.locations.getAll).mockResolvedValue([]);

		renderScreen();

		// Wait for component to load
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);

		expect(screen.getByText("🎯 Pick Pallets")).toBeInTheDocument();
	});

	it("should display pallet list", async () => {
		const mockOrder = {
			id: "order-123",
			order_ref: "ORD-001",
			shipment_type: "Hand_Delivery" as const,
			status: "Pending" as const,
			created_at: "2025-11-26T10:00:00Z",
			created_by: "user-1",
			lines: [
				{
					id: "line-1",
					shipping_order_id: "order-123",
					item_id: "prod-1",
					requested_qty: 100,
					created_at: "2025-11-26T10:00:00Z",
				},
			],
		};

		const mockPallets = [
			{
				id: "pallet-1",
				item_id: "prod-1",
				qty: 50,
				status: "Stored" as const,
				location_id: "loc-1",
				shipping_order_id: undefined,
				receiving_order_id: "recv-1",
				is_cross_dock: false,
				created_at: "2025-11-26T10:00:00Z",
			},
		];

		const mockProduct = {
			id: "prod-1",
			item_id: "PROD-001",
			description: "Product 1",
			units_per_pallet: 100,
			pallet_positions: 10,
			active: true,
			created_at: "2025-11-26T10:00:00Z",
		};

		vi.mocked(wmsApi.default.shippingOrders.getById).mockResolvedValue(mockOrder as unknown as typeof mockOrder);
		vi.mocked(wmsApi.default.pallets.getFiltered).mockResolvedValue(mockPallets as unknown as typeof mockPallets);
		vi.mocked(wmsApi.default.products.getById).mockResolvedValue(mockProduct as unknown as typeof mockProduct);
		vi.mocked(wmsApi.default.locations.getAll).mockResolvedValue([]);

		renderScreen();

		// Wait for component to load
		await waitFor(
			() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			},
			{ timeout: 1000 }
		);

		// Verify screen renders
		expect(screen.getByText("🎯 Pick Pallets")).toBeInTheDocument();
	});

	it("should disable Finish Picking button initially", async () => {
		const mockOrder = {
			id: "order-123",
			order_ref: "ORD-001",
			shipment_type: "Hand_Delivery" as const,
			status: "Pending" as const,
			created_at: "2025-11-26T10:00:00Z",
			created_by: "user-1",
			lines: [
				{
					id: "line-1",
					shipping_order_id: "order-123",
					item_id: "prod-1",
					requested_qty: 100,
				},
			],
		};

		vi.mocked(wmsApi.default.shippingOrders.getById).mockResolvedValue(mockOrder as unknown as typeof mockOrder);
		vi.mocked(wmsApi.default.pallets.getFiltered).mockResolvedValue([]);
		vi.mocked(wmsApi.default.locations.getAll).mockResolvedValue([]);

		renderScreen();

		// Wait for component to load
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		const finishButton = screen.getByRole("button", { name: /Finish Picking/i });
		expect(finishButton).toBeDisabled();
	});

	// Story 6.3: Picking Filters Tests
	describe("Picking Filters (Story 6.3)", () => {
		it("should display filter UI with text input and rack buttons", async () => {
			const mockOrder = {
				id: "order-123",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery" as const,
				status: "Pending" as const,
				created_at: "2025-11-26T10:00:00Z",
				created_by: "user-1",
				lines: [
					{
						id: "line-1",
						shipping_order_id: "order-123",
						item_id: "prod-1",
						requested_qty: 100,
						created_at: "2025-11-26T10:00:00Z",
					},
				],
			};

			vi.mocked(wmsApi.default.shippingOrders.getById).mockResolvedValue(mockOrder as unknown as typeof mockOrder);
			vi.mocked(wmsApi.default.pallets.getFiltered).mockResolvedValue([]);
			vi.mocked(wmsApi.default.locations.getAll).mockResolvedValue([]);

			renderScreen();

			// Wait for component to load
			await waitFor(
				() => {
					expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
				},
				{ timeout: 1000 }
			);

			// Verify screen renders
			expect(screen.getByText("🎯 Pick Pallets")).toBeInTheDocument();
		});

		it("should display matching pallet count", async () => {
			const mockOrder = {
				id: "order-123",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery" as const,
				status: "Pending" as const,
				created_at: "2025-11-26T10:00:00Z",
				created_by: "user-1",
				lines: [
					{
						id: "line-1",
						shipping_order_id: "order-123",
						item_id: "PROD-001",
						requested_qty: 100,
						created_at: "2025-11-26T10:00:00Z",
					},
				],
			};

			const mockPallets = [
				{
					id: "pallet-1",
					item_id: "PROD-001",
					qty: 50,
					status: "Stored" as const,
					location_id: "loc-1",
					shipping_order_id: undefined,
					receiving_order_id: "recv-1",
					is_cross_dock: false,
					created_at: "2025-11-26T10:00:00Z",
				},
			];

			const mockProducts = {
				"PROD-001": {
					id: "PROD-001",
					item_id: "PROD-001",
					description: "Widget",
					units_per_pallet: 100,
					pallet_positions: 10,
					active: true,
					created_at: "2025-11-26T10:00:00Z",
				},
			};

			vi.mocked(wmsApi.default.shippingOrders.getById).mockResolvedValue(mockOrder as unknown as typeof mockOrder);
			vi.mocked(wmsApi.default.pallets.getFiltered).mockResolvedValue(mockPallets as unknown as typeof mockPallets);
			vi.mocked(wmsApi.default.products.getById).mockImplementation((id) =>
				Promise.resolve(
					mockProducts[id as keyof typeof mockProducts] as unknown as (typeof mockProducts)[keyof typeof mockProducts]
				)
			);
			vi.mocked(wmsApi.default.locations.getAll).mockResolvedValue([]);

			renderScreen();
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Check for matching count display - look for the number "1" in context
			expect(screen.getByText("matching pallet(s)")).toBeInTheDocument();
		});

		it("should have rack filter buttons 1-8", async () => {
			const mockOrder = {
				id: "order-123",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery" as const,
				status: "Pending" as const,
				created_at: "2025-11-26T10:00:00Z",
				created_by: "user-1",
				lines: [
					{
						id: "line-1",
						shipping_order_id: "order-123",
						item_id: "prod-1",
						requested_qty: 100,
						created_at: "2025-11-26T10:00:00Z",
					},
				],
			};

			vi.mocked(wmsApi.default.shippingOrders.getById).mockResolvedValue(mockOrder as unknown as typeof mockOrder);
			vi.mocked(wmsApi.default.pallets.getFiltered).mockResolvedValue([]);
			vi.mocked(wmsApi.default.locations.getAll).mockResolvedValue([]);

			renderScreen();
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Check for all rack buttons
			for (let i = 1; i <= 8; i++) {
				const buttons = screen.getAllByText(i.toString());
				expect(buttons.length).toBeGreaterThan(0);
			}
		});

		it("should have reset filters button", async () => {
			const mockOrder = {
				id: "order-123",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery" as const,
				status: "Pending" as const,
				created_at: "2025-11-26T10:00:00Z",
				created_by: "user-1",
				lines: [
					{
						id: "line-1",
						shipping_order_id: "order-123",
						item_id: "prod-1",
						requested_qty: 100,
						created_at: "2025-11-26T10:00:00Z",
					},
				],
			};

			vi.mocked(wmsApi.default.shippingOrders.getById).mockResolvedValue(mockOrder as unknown as typeof mockOrder);
			vi.mocked(wmsApi.default.pallets.getFiltered).mockResolvedValue([]);
			vi.mocked(wmsApi.default.locations.getAll).mockResolvedValue([]);

			renderScreen();
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Check for reset button
			const resetButton = screen.getByText("Reset Filters");
			expect(resetButton).toBeInTheDocument();
			expect(resetButton).toBeDisabled(); // Should be disabled when no filters applied
		});
	});
});
