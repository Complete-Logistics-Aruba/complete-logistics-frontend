/**
 * Screen 8 Tests: Put-Away Pallet Assignment
 *
 * Tests for Story 5.1 acceptance criteria
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { locations, pallets as palletsApi, products } from "../../lib/api/wms-api";
import type { Pallet, Product } from "../../types/domain";
import Screen8 from "./screen8";

interface PalletWithProduct extends Pallet {
	product?: Product;
}

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => ({
	pallets: {
		getFiltered: vi.fn(),
		update: vi.fn(),
	},
	products: {
		getByItemId: vi.fn(),
	},
	locations: {
		getAll: vi.fn(),
		resolve: vi.fn(),
	},
	warehouses: {
		getDefault: vi.fn().mockResolvedValue({ id: "warehouse-1" }),
	},
}));

// Mock supabase
vi.mock("../../lib/auth/supabase-client", () => ({
	supabase: {
		from: vi.fn(),
	},
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const mockPallets: PalletWithProduct[] = [
	{
		id: "pallet-1",
		item_id: "ITEM-001",
		qty: 100,
		status: "Received" as const,
		shipping_order_id: undefined,
		receiving_order_id: "rec-1",
		is_cross_dock: false,
		created_at: "2025-11-26T10:00:00Z",
		product: {
			id: "prod-1",
			item_id: "ITEM-001",
			description: "Widget A",
			units_per_pallet: 100,
			pallet_positions: 1,
			active: true,
			created_at: "2025-11-26T10:00:00Z",
		},
	},
	{
		id: "pallet-2",
		item_id: "ITEM-002",
		qty: 50,
		status: "Received" as const,
		shipping_order_id: undefined,
		receiving_order_id: "rec-1",
		is_cross_dock: false,
		created_at: "2025-11-26T10:00:00Z",
		product: {
			id: "prod-2",
			item_id: "ITEM-002",
			description: "Widget B",
			units_per_pallet: 50,
			pallet_positions: 1,
			active: true,
			created_at: "2025-11-26T10:00:00Z",
		},
	},
];

const renderScreen = () => {
	return render(
		<BrowserRouter>
			<SnackbarProvider>
				<Screen8 />
			</SnackbarProvider>
		</BrowserRouter>
	);
};

describe("Screen 8: Put-Away Pallet Assignment", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render loading state initially", () => {
		vi.mocked(palletsApi.getFiltered).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderScreen();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should show Complete Put-Away button when list empty (AC: 7)", async () => {
		vi.mocked(palletsApi.getFiltered).mockResolvedValue([]);

		renderScreen();

		await waitFor(() => {
			expect(screen.getByText("Complete Put-Away")).toBeInTheDocument();
		});
	});

	it("should show empty state message when no pallets (AC: 1)", async () => {
		vi.mocked(palletsApi.getFiltered).mockResolvedValue([]);

		renderScreen();

		await waitFor(() => {
			expect(screen.getByText("All pallets assigned!")).toBeInTheDocument();
			expect(screen.getByText("No more pallets to put away.")).toBeInTheDocument();
		});
	});

	// Story 5.2: Internal Pallet Moves Tests

	it("should display Move Pallet tab (AC: 1)", async () => {
		vi.mocked(palletsApi.getFiltered).mockResolvedValue(mockPallets);
		vi.mocked(products.getByItemId).mockImplementation((id) => {
			if (id === "prod-1") return Promise.resolve(mockPallets[0].product!);
			if (id === "prod-2") return Promise.resolve(mockPallets[1].product!);
			return Promise.reject(new Error("Product not found"));
		});

		renderScreen();

		await waitFor(
			() => {
				expect(screen.getByText("Put-Away Assignment")).toBeInTheDocument();
				expect(screen.getByText("Move Pallet")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it("should display current location when selecting pallet to move (AC: 3)", async () => {
		const storedPallet: PalletWithProduct = {
			...mockPallets[0],
			status: "Stored" as const,
			location_id: "loc-1",
		};

		// Mock the three calls: initial load, tab switch, and potential refresh
		vi.mocked(palletsApi.getFiltered)
			.mockResolvedValueOnce(mockPallets) // Initial load for Put-Away tab
			.mockResolvedValueOnce([storedPallet]) // Initial load for Move Pallet tab
			.mockResolvedValueOnce([storedPallet]); // Tab switch refresh

		vi.mocked(products.getByItemId).mockImplementation((id) => {
			if (id === "prod-1") return Promise.resolve(mockPallets[0].product!);
			return Promise.reject(new Error("Product not found"));
		});

		// Mock locations.getAll to return some locations
		vi.mocked(locations.getAll).mockResolvedValue([
			{ location_id: "loc-1", type: "RACK", rack: 1, position: "A-1", warehouse_id: "warehouse-1" },
			{ location_id: "loc-2", type: "RACK", rack: 2, position: "B-1", warehouse_id: "warehouse-1" },
		]);

		renderScreen();

		// Switch to Move Pallet tab
		await waitFor(
			() => {
				const tabs = screen.getAllByRole("tab");
				fireEvent.click(tabs[1]);
			},
			{ timeout: 3000 }
		);

		// Verify current location is displayed
		await waitFor(
			() => {
				expect(screen.getByText("loc-1")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
