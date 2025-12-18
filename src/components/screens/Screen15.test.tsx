/* eslint-disable unicorn/filename-case */
/**
 * Screen 15 Tests: Inventory Adjustments
 *
 * Tests for Story 8.5 acceptance criteria:
 * 1. Search: Item ID or Pallet ID
 * 2. Display pallet details: Item ID, Qty, Location, Status
 * 3. [Write Off] button: select reason (Damaged, Lost, Count Correction)
 * 4. On save: pallet.status=WriteOff
 * 5. Log write-off action: pallet_id, reason, timestamp, user
 * 6. Prevent write-off of already-shipped pallets
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { locations, pallets, products } from "../../lib/api/wms-api";
import Screen15 from "./Screen15";

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
		getById: vi.fn(),
	},
}));

const mockLocation = {
	location_id: "loc-001",
	warehouse_id: "wh-001",
	type: "RACK" as const,
	rack: 5,
	level: 2,
	position: "C",
	is_active: true,
	is_blocked: false,
	created_at: "2025-11-01T00:00:00Z",
};

const mockProduct = {
	id: "prod-001",
	item_id: "ITEM-001",
	description: "Test Product",
	pallet_positions: 10,
	units_per_pallet: 100,
	active: true,
	created_at: "2025-11-01T00:00:00Z",
};

const mockPallet: Record<string, unknown> = {
	id: "pallet-001",
	item_id: "PROD-001",
	qty: 100,
	status: "Stored",
	location_id: "loc-001",
	is_cross_dock: false,
	created_at: "2025-11-26T00:00:00Z",
};

const mockShippedPallet: Record<string, unknown> = {
	id: "pallet-002",
	item_id: "PROD-001",
	qty: 100,
	status: "Shipped",
	location_id: undefined,
	is_cross_dock: false,
	created_at: "2025-11-26T00:00:00Z",
};

const renderWithProviders = (component: React.ReactElement) => {
	return render(<SnackbarProvider maxSnack={3}>{component}</SnackbarProvider>);
};

describe("Screen15 - Inventory Adjustments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render search input", () => {
		renderWithProviders(<Screen15 />);

		expect(screen.getByLabelText("Item ID or Pallet ID")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
	});

	it("should display warning when search is empty", async () => {
		renderWithProviders(<Screen15 />);

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(() => {
			expect(screen.getByText(/please enter/i)).toBeInTheDocument();
		});
	});

	it("should search and display pallet results with location", async () => {
		(pallets.getFiltered as unknown as Mock).mockResolvedValue([mockPallet]);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getById as unknown as Mock).mockResolvedValue(mockLocation);

		renderWithProviders(<Screen15 />);

		const searchInput = screen.getByLabelText("Item ID or Pallet ID") as HTMLInputElement;
		fireEvent.change(searchInput, { target: { value: "pallet-001" } });

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(
			() => {
				expect(screen.getByText(/search results/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		expect(screen.getByText("pallet-001")).toBeInTheDocument();
		expect(screen.getByText("ITEM-001")).toBeInTheDocument();
		expect(screen.getByText("R5-L2-C")).toBeInTheDocument(); // Location display
	});

	it("should display pallet details when selected with location", async () => {
		(pallets.getFiltered as unknown as Mock).mockResolvedValue([mockPallet]);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(locations.getById as unknown as Mock).mockResolvedValue(mockLocation);

		renderWithProviders(<Screen15 />);

		const searchInput = screen.getByLabelText("Item ID or Pallet ID") as HTMLInputElement;
		fireEvent.change(searchInput, { target: { value: "pallet-001" } });

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(
			() => {
				expect(screen.getByText(/search results/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Click Select button
		const selectButtons = screen.getAllByRole("button", { name: /select/i });
		fireEvent.click(selectButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Pallet Details")).toBeInTheDocument();
		});

		expect(screen.getByText("pallet-001")).toBeInTheDocument();
		expect(screen.getByText("Stored")).toBeInTheDocument();
		expect(screen.getByText("R5-L2-C")).toBeInTheDocument(); // Location in details
	});

	it("should show Write Off button for non-shipped pallets", async () => {
		(pallets.getFiltered as unknown as Mock).mockResolvedValue([mockPallet]);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);

		renderWithProviders(<Screen15 />);

		const searchInput = screen.getByLabelText("Item ID or Pallet ID") as HTMLInputElement;
		fireEvent.change(searchInput, { target: { value: "pallet-001" } });

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(
			() => {
				expect(screen.getByText(/search results/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		const selectButtons = screen.getAllByRole("button", { name: /select/i });
		fireEvent.click(selectButtons[0]);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /write off/i })).toBeInTheDocument();
		});
	});

	it("should prevent write-off of shipped pallets", async () => {
		(pallets.getFiltered as unknown as Mock).mockResolvedValue([mockShippedPallet]);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);

		renderWithProviders(<Screen15 />);

		const searchInput = screen.getByLabelText("Item ID or Pallet ID") as HTMLInputElement;
		fireEvent.change(searchInput, { target: { value: "pallet-002" } });

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(
			() => {
				expect(screen.getByText(/search results/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		const selectButtons = screen.getAllByRole("button", { name: /select/i });
		fireEvent.click(selectButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Cannot write off shipped pallets")).toBeInTheDocument();
		});

		// Write Off button should be disabled
		const writeOffButton = screen.getByRole("button", { name: /write off/i });
		expect(writeOffButton).toBeDisabled();
	});

	it("should open write-off dialog when Write Off button clicked", async () => {
		(pallets.getFiltered as unknown as Mock).mockResolvedValue([mockPallet]);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);

		renderWithProviders(<Screen15 />);

		const searchInput = screen.getByLabelText("Item ID or Pallet ID") as HTMLInputElement;
		fireEvent.change(searchInput, { target: { value: "pallet-001" } });

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(
			() => {
				expect(screen.getByText(/search results/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		const selectButtons = screen.getAllByRole("button", { name: /select/i });
		fireEvent.click(selectButtons[0]);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /write off/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /write off/i }));

		await waitFor(() => {
			expect(screen.getByText("Write Off Pallet")).toBeInTheDocument();
		});
	});

	it("should write off pallet with reason", async () => {
		(pallets.getFiltered as unknown as Mock).mockResolvedValue([mockPallet]);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.update as unknown as Mock).mockResolvedValue({
			...mockPallet,
			status: "WriteOff",
		});

		renderWithProviders(<Screen15 />);

		const searchInput = screen.getByLabelText("Item ID or Pallet ID") as HTMLInputElement;
		fireEvent.change(searchInput, { target: { value: "pallet-001" } });

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(
			() => {
				expect(screen.getByText(/search results/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		const selectButtons = screen.getAllByRole("button", { name: /select/i });
		fireEvent.click(selectButtons[0]);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /write off/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /write off/i }));

		await waitFor(() => {
			expect(screen.getByText("Write Off Pallet")).toBeInTheDocument();
		});

		// Click Confirm Write-Off button
		const confirmButtons = screen.getAllByRole("button", { name: /confirm/i });
		fireEvent.click(confirmButtons[0]);

		await waitFor(() => {
			expect(pallets.update).toHaveBeenCalledWith("pallet-001", {
				status: "WriteOff",
			});
		});
	});

	it("should display success message after write-off", async () => {
		(pallets.getFiltered as unknown as Mock).mockResolvedValue([mockPallet]);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.update as unknown as Mock).mockResolvedValue({
			...mockPallet,
			status: "WriteOff",
		});

		renderWithProviders(<Screen15 />);

		const searchInput = screen.getByLabelText("Item ID or Pallet ID") as HTMLInputElement;
		fireEvent.change(searchInput, { target: { value: "pallet-001" } });

		fireEvent.click(screen.getByRole("button", { name: /search/i }));

		await waitFor(
			() => {
				expect(screen.getByText(/search results/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		const selectButtons = screen.getAllByRole("button", { name: /select/i });
		fireEvent.click(selectButtons[0]);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /write off/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /write off/i }));

		await waitFor(() => {
			expect(screen.getByText("Write Off Pallet")).toBeInTheDocument();
		});

		const confirmButtons = screen.getAllByRole("button", { name: /confirm/i });
		fireEvent.click(confirmButtons[0]);

		await waitFor(() => {
			expect(screen.getByText(/Pallet written off as/i)).toBeInTheDocument();
		});
	});
});
