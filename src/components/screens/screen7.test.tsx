/**
 * Screen 7: Pallet Tallying Tests
 *
 * Tests for pallet row display, qty editing, confirm/undo, and finish tally.
 *
 * @module components/screens/Screen7.test
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import * as wmsApi from "../../lib/api/wms-api";
import { AuthProvider } from "../../lib/auth/auth-context";
import Screen7 from "./screen7";

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => {
	const receivingOrdersMock = {
		getById: vi.fn(),
		update: vi.fn(),
	};
	const receivingOrderLinesMock = {
		getByReceivingOrderId: vi.fn(),
	};
	const productsMock = {
		getByItemId: vi.fn(),
	};
	const palletsMock = {
		create: vi.fn(),
		delete: vi.fn(),
		getFiltered: vi.fn(),
	};
	const shippingOrdersMock = {
		getAll: vi.fn(),
		getById: vi.fn(),
	};
	const getShipNowOrderMock = vi.fn();
	return {
		receivingOrders: receivingOrdersMock,
		receivingOrderLines: receivingOrderLinesMock,
		products: productsMock,
		pallets: palletsMock,
		shippingOrders: shippingOrdersMock,
		getShipNowOrder: getShipNowOrderMock,
		default: {
			receivingOrders: receivingOrdersMock,
			receivingOrderLines: receivingOrderLinesMock,
			products: productsMock,
			pallets: palletsMock,
			shippingOrders: shippingOrdersMock,
			getShipNowOrder: getShipNowOrderMock,
		},
	};
});

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = {
	state: {
		receivingOrderId: "order-1",
		containerNum: "CONT-001",
		sealNum: "SEAL-001",
	},
};

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => mockLocation,
	};
});

const renderScreen7 = () => {
	return render(
		<BrowserRouter>
			<AuthProvider>
				<SnackbarProvider>
					<Screen7 />
				</SnackbarProvider>
			</AuthProvider>
		</BrowserRouter>
	);
};

describe("Screen 7 - Pallet Tallying", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render loading state initially", () => {
		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderScreen7();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display pallet rows with item info", async () => {
		const mockOrder = {
			id: "order-1",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
			status: "pending",
			created_at: "2025-11-26T00:00:00Z",
			created_by: "user-1",
		};

		const mockLines = [
			{
				id: "line-1",
				receiving_order_id: "order-1",
				item_id: "PROD-001",
				expected_qty: 100,
				created_at: "2025-11-26T00:00:00Z",
			},
		];

		const mockProduct = {
			id: "prod-1",
			item_id: "ITEM-123",
			description: "Test Product",
			units_per_pallet: 50,
			pallet_positions: 1,
			active: true,
			created_at: "2025-11-26T00:00:00Z",
		};

		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(wmsApi.default.receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(wmsApi.default.products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(wmsApi.default.pallets.getFiltered as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.shippingOrders.getAll as unknown as Mock).mockResolvedValue([]);

		renderScreen7();

		await waitFor(() => {
			expect(screen.getByText("ITEM-123")).toBeInTheDocument();
			expect(screen.getByText("Test Product")).toBeInTheDocument();
		});
	});

	it("should display order info (container, seal, status)", async () => {
		const mockOrder = {
			id: "order-1",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
			status: "pending",
			created_at: "2025-11-26T00:00:00Z",
			created_by: "user-1",
		};

		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(wmsApi.default.receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.pallets.getFiltered as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.shippingOrders.getAll as unknown as Mock).mockResolvedValue([]);

		renderScreen7();

		await waitFor(() => {
			expect(screen.getByText("CONT-001")).toBeInTheDocument();
			expect(screen.getByText("SEAL-001")).toBeInTheDocument();
		});
	});

	it("should enable Finish Tally button only when ALL expected pallets are confirmed", async () => {
		const mockOrder = {
			id: "order-1",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
			status: "pending",
			created_at: "2025-11-26T00:00:00Z",
			created_by: "user-1",
		};

		const mockLines = [
			{
				id: "line-1",
				receiving_order_id: "order-1",
				item_id: "ITEM-001",
				expected_qty: 1000,
				created_at: "2025-11-26T00:00:00Z",
			},
		];

		const mockProduct = {
			id: "prod-1",
			item_id: "ITEM-001",
			description: "Test Product",
			units_per_pallet: 500,
			pallet_positions: 1,
			active: true,
		};

		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(wmsApi.default.receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(wmsApi.default.products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(wmsApi.default.pallets.getFiltered as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.shippingOrders.getAll as unknown as Mock).mockResolvedValue([]);

		renderScreen7();

		// Button should be disabled when no pallets confirmed (expected: 2, confirmed: 0)
		await waitFor(() => {
			const finishButton = screen.getByText("Finish Tally");
			expect(finishButton).toBeDisabled();
		});

		// Warning message should show requirement
		await waitFor(() => {
			expect(screen.getByText(/Confirm all 2 pallets to finish/)).toBeInTheDocument();
		});
	});

	it("should display pallet table with correct columns", async () => {
		const mockOrder = {
			id: "order-1",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
			status: "pending",
			created_at: "2025-11-26T00:00:00Z",
			created_by: "user-1",
		};

		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(wmsApi.default.receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.pallets.getFiltered as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.shippingOrders.getAll as unknown as Mock).mockResolvedValue([]);

		renderScreen7();

		await waitFor(() => {
			expect(screen.getByText("Item ID")).toBeInTheDocument();
			expect(screen.getByText("Description")).toBeInTheDocument();
			expect(screen.getByText("Expected Qty")).toBeInTheDocument();
			expect(screen.getByText("Units/Pallet")).toBeInTheDocument();
			expect(screen.getByText("Actual Qty/Pallet")).toBeInTheDocument();
			expect(screen.getByText("Confirmed")).toBeInTheDocument();
			expect(screen.getByText("Actions")).toBeInTheDocument();
		});
	});

	it("should handle error gracefully", async () => {
		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockRejectedValue(new Error("Failed to load data"));

		renderScreen7();

		// Component should render without crashing (loading state visible)
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).toBeInTheDocument();
		});
	});

	it("should calculate RemainingQty and show SHIP-NOW button when available", async () => {
		const mockOrder = {
			id: "order-1",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
			status: "pending",
			created_at: "2025-11-26T00:00:00Z",
			created_by: "user-1",
		};

		const mockLines = [
			{
				id: "line-1",
				receiving_order_id: "order-1",
				item_id: "ITEM-123",
				expected_qty: 100,
				created_at: "2025-11-26T00:00:00Z",
			},
		];

		const mockProduct = {
			id: "prod-1",
			item_id: "ITEM-123",
			description: "Test Product",
			units_per_pallet: 50,
			pallet_positions: 1,
			active: true,
			created_at: "2025-11-26T00:00:00Z",
		};

		const mockShippingOrder = {
			id: "so-1",
			status: "Pending",
			created_at: "2025-11-26T00:00:00Z",
			lines: [
				{
					id: "sol-1",
					shipping_order_id: "so-1",
					item_id: "ITEM-123",
					requested_qty: 100,
				},
			],
		};

		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(wmsApi.default.receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(wmsApi.default.products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(wmsApi.default.pallets.getFiltered as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);
		(wmsApi.default.shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);

		renderScreen7();

		await waitFor(() => {
			// SHIP-NOW button should be visible when RemainingQty > 0
			const shipNowButton = screen.queryByRole("button", { name: /ship-now/i });
			expect(shipNowButton).toBeInTheDocument();
		});
	});

	it("should create cross-dock pallet on SHIP-NOW click", async () => {
		const mockOrder = {
			id: "order-1",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
			status: "pending",
			created_at: "2025-11-26T00:00:00Z",
			created_by: "user-1",
		};

		const mockLines = [
			{
				id: "line-1",
				receiving_order_id: "order-1",
				item_id: "PROD-001",
				expected_qty: 100,
				created_at: "2025-11-26T00:00:00Z",
			},
		];

		const mockProduct = {
			id: "prod-1",
			item_id: "ITEM-123",
			description: "Test Product",
			units_per_pallet: 50,
			pallet_positions: 1,
			active: true,
			created_at: "2025-11-26T00:00:00Z",
		};

		const mockShippingOrder = {
			id: "so-1",
			status: "Pending",
			created_at: "2025-11-26T00:00:00Z",
			lines: [
				{
					id: "sol-1",
					shipping_order_id: "so-1",
					item_id: "ITEM-123",
					requested_qty: 100,
				},
			],
		};

		const mockCreatedPallet = {
			id: "pallet-1",
			receiving_order_id: "order-1",
			item_id: "ITEM-123",
			qty: 50,
			status: "Received",
			shipping_order_id: "so-1",
			is_cross_dock: true,
			created_at: "2025-11-26T00:00:00Z",
		};

		(wmsApi.default.receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(wmsApi.default.receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(wmsApi.default.products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(wmsApi.default.pallets.getFiltered as unknown as Mock).mockResolvedValue([]);
		(wmsApi.default.shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);
		(wmsApi.default.shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(wmsApi.default.pallets.create as unknown as Mock).mockResolvedValue(mockCreatedPallet);
		(wmsApi.default.getShipNowOrder as unknown as Mock).mockResolvedValue(mockShippingOrder);

		renderScreen7();

		await waitFor(() => {
			const shipNowButton = screen.queryByRole("button", { name: /ship-now/i });
			expect(shipNowButton).toBeInTheDocument();
		});

		// Click SHIP-NOW button
		const shipNowButton = screen.getByRole("button", { name: /ship-now/i });
		fireEvent.click(shipNowButton);

		// Verify pallet.create was called with correct params
		await waitFor(() => {
			expect(wmsApi.default.pallets.create).toHaveBeenCalledWith(
				expect.objectContaining({
					receiving_order_id: "order-1",
					item_id: "ITEM-123",
					status: "Received",
					shipping_order_id: "so-1",
					is_cross_dock: true,
				})
			);
		});
	});
});
