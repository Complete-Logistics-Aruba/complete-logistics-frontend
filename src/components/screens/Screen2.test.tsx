/* eslint-disable unicorn/filename-case */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { pallets, products, receivingOrderLines, receivingOrders } from "../../lib/api/wms-api";
import Screen2 from "./Screen2";

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => ({
	receivingOrders: {
		getById: vi.fn(),
		update: vi.fn(),
	},
	receivingOrderLines: {
		getByReceivingOrderId: vi.fn(),
	},
	pallets: {
		getFiltered: vi.fn(),
	},
	products: {
		getById: vi.fn(),
		getByItemId: vi.fn(),
	},
}));

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = {
	pathname: "/warehouse/screen-2",
	search: "",
	hash: "",
	state: {
		receivingOrderId: "order-123",
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

const renderScreen2 = () => {
	return render(
		<BrowserRouter>
			<SnackbarProvider>
				<Screen2 />
			</SnackbarProvider>
		</BrowserRouter>
	);
};

describe("Screen 2: Receiving Summary Review", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render loading state initially", () => {
		(receivingOrders.getById as unknown as Mock).mockImplementation(() => new Promise(() => {}));

		renderScreen2();

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display receiving order details", async () => {
		const mockOrder = {
			id: "order-123",
			status: "Staged",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
		};

		const mockLines = [
			{
				id: "line-1",
				item_id: "ITEM-001",
				expected_qty: 100,
			},
		];

		const mockProduct = {
			id: "prod-1",
			description: "Widget A",
			units_per_pallet: 50,
		};

		const mockPallets = [
			{
				id: "pallet-1",
				item_id: "ITEM-001",
				qty: 100,
				receiving_order_id: "order-123",
			},
		];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(() => {
			expect(screen.getByText("CONT-001")).toBeInTheDocument();
			expect(screen.getByText("SEAL-001")).toBeInTheDocument();
			expect(screen.getByText("Staged")).toBeInTheDocument();
		});
	});

	it("should display summary table with all items", async () => {
		const mockOrder = {
			id: "order-123",
			status: "Staged",
			container_num: "CONT-001",
			seal_num: "SEAL-001",
		};

		const mockLines = [
			{
				id: "line-1",
				item_id: "ITEM-001",
				expected_qty: 100,
			},
			{
				id: "line-2",
				item_id: "ITEM-002",
				expected_qty: 50,
			},
		];

		const mockProducts = {
			"ITEM-001": { id: "prod-1", description: "Widget A", units_per_pallet: 50 },
			"ITEM-002": { id: "prod-2", description: "Widget B", units_per_pallet: 25 },
		};

		const mockPallets = [
			{ id: "pallet-1", item_id: "ITEM-001", qty: 100, receiving_order_id: "order-123" },
			{ id: "pallet-2", item_id: "ITEM-002", qty: 50, receiving_order_id: "order-123" },
		];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockImplementation((itemId: string) =>
			Promise.resolve(mockProducts[itemId as keyof typeof mockProducts])
		);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(() => {
			expect(screen.getByText("Widget A")).toBeInTheDocument();
			expect(screen.getByText("Widget B")).toBeInTheDocument();
			expect(screen.getByText("ITEM-001")).toBeInTheDocument();
			expect(screen.getByText("ITEM-002")).toBeInTheDocument();
		});
	});

	it("should calculate Expected Qty correctly", async () => {
		const mockOrder = { id: "order-123", status: "staged" };
		const mockLines = [{ id: "line-1", item_id: "ITEM-001", expected_qty: 100 }];
		const mockProduct = { id: "prod-1", description: "Widget A", units_per_pallet: 50 };
		const mockPallets = [{ id: "pallet-1", item_id: "ITEM-001", qty: 100, receiving_order_id: "order-123" }];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(() => {
			const cells = screen.getAllByRole("cell");
			// Find the Expected Qty cell (should be 100)
			expect(cells.some((cell) => cell.textContent === "100")).toBe(true);
		});
	});

	it("should calculate Received Qty correctly", async () => {
		const mockOrder = { id: "order-123", status: "staged" };
		const mockLines = [{ id: "line-1", item_id: "ITEM-001", expected_qty: 100 }];
		const mockProduct = { id: "prod-1", description: "Widget A", units_per_pallet: 50 };
		const mockPallets = [
			{ id: "pallet-1", item_id: "ITEM-001", qty: 95, receiving_order_id: "order-123" },
			{ id: "pallet-2", item_id: "ITEM-001", qty: 5, receiving_order_id: "order-123" },
		];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(() => {
			const cells = screen.getAllByRole("cell");
			// Received Qty should be 100 (95 + 5)
			expect(cells.some((cell) => cell.textContent === "100")).toBe(true);
		});
	});

	it("should calculate Difference correctly (overage)", async () => {
		const mockOrder = { id: "order-123", status: "Staged", container_num: "CONT-001", seal_num: "SEAL-001" };
		const mockLines = [{ id: "line-1", item_id: "ITEM-001", expected_qty: 100 }];
		const mockProduct = { id: "prod-1", description: "Widget A", units_per_pallet: 50 };
		const mockPallets = [{ id: "pallet-1", item_id: "ITEM-001", qty: 110, receiving_order_id: "order-123" }];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(
			() => {
				const cells = screen.getAllByRole("cell");
				expect(cells.some((cell) => cell.textContent?.includes("+10"))).toBe(true);
			},
			{ timeout: 2000 }
		);
	});

	it("should calculate Difference correctly (shortage)", async () => {
		const mockOrder = { id: "order-123", status: "Staged", container_num: "CONT-001", seal_num: "SEAL-001" };
		const mockLines = [{ id: "line-1", item_id: "ITEM-001", expected_qty: 100 }];
		const mockProduct = { id: "prod-1", description: "Widget A", units_per_pallet: 50 };
		const mockPallets = [{ id: "pallet-1", item_id: "ITEM-001", qty: 90, receiving_order_id: "order-123" }];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(
			() => {
				const cells = screen.getAllByRole("cell");
				expect(cells.some((cell) => cell.textContent?.includes("-10"))).toBe(true);
			},
			{ timeout: 2000 }
		);
	});

	it("should highlight rows with discrepancies", async () => {
		const mockOrder = { id: "order-123", status: "Staged", container_num: "CONT-001", seal_num: "SEAL-001" };
		const mockLines = [
			{ id: "line-1", item_id: "ITEM-001", expected_qty: 100 },
			{ id: "line-2", item_id: "ITEM-002", expected_qty: 50 },
		];
		const mockProducts = {
			"ITEM-001": { id: "prod-1", description: "Widget A", units_per_pallet: 50 },
			"ITEM-002": { id: "prod-2", description: "Widget B", units_per_pallet: 25 },
		};
		const mockPallets = [
			{ id: "pallet-1", item_id: "ITEM-001", qty: 100, receiving_order_id: "order-123" },
			{ id: "pallet-2", item_id: "ITEM-002", qty: 55, receiving_order_id: "order-123" }, // Overage
		];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockImplementation((itemId: string) =>
			Promise.resolve(mockProducts[itemId as keyof typeof mockProducts])
		);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(() => {
			// Check that discrepancy alert is shown
			const alertText = screen.queryByText(/item\(s\) have quantity discrepancies/);
			expect(alertText).toBeInTheDocument();
		});
	});

	it("should display action buttons", async () => {
		const mockOrder = { id: "order-123", status: "Staged", container_num: "CONT-001", seal_num: "SEAL-001" };
		const mockLines = [{ id: "line-1", item_id: "ITEM-001", expected_qty: 100 }];
		const mockProduct = { id: "prod-1", description: "Widget A", units_per_pallet: 50 };
		const mockPallets = [{ id: "pallet-1", item_id: "ITEM-001", qty: 100, receiving_order_id: "order-123" }];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockResolvedValue(mockProduct);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(
			() => {
				const buttons = screen.getAllByRole("button");
				expect(buttons.length).toBeGreaterThan(0);
				// Check for button text content
				const buttonTexts = buttons.map((btn) => btn.textContent);
				expect(buttonTexts.some((text) => text?.includes("Back to Orders"))).toBe(true);
				expect(buttonTexts.some((text) => text?.includes("Confirm & Proceed"))).toBe(true);
			},
			{ timeout: 3000 }
		);
	});

	it("should display summary statistics", async () => {
		const mockOrder = { id: "order-123", status: "Staged", container_num: "CONT-001", seal_num: "SEAL-001" };
		const mockLines = [
			{ id: "line-1", item_id: "ITEM-001", expected_qty: 100 },
			{ id: "line-2", item_id: "ITEM-002", expected_qty: 50 },
		];
		const mockProducts = {
			"ITEM-001": { id: "prod-1", description: "Widget A", units_per_pallet: 50 },
			"ITEM-002": { id: "prod-2", description: "Widget B", units_per_pallet: 25 },
		};
		const mockPallets = [
			{ id: "pallet-1", item_id: "ITEM-001", qty: 100, receiving_order_id: "order-123" },
			{ id: "pallet-2", item_id: "ITEM-002", qty: 50, receiving_order_id: "order-123" },
		];

		(receivingOrders.getById as unknown as Mock).mockResolvedValue(mockOrder);
		(receivingOrderLines.getByReceivingOrderId as unknown as Mock).mockResolvedValue(mockLines);
		(products.getByItemId as unknown as Mock).mockImplementation((itemId: string) =>
			Promise.resolve(mockProducts[itemId as keyof typeof mockProducts])
		);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockPallets);

		renderScreen2();

		await waitFor(() => {
			expect(screen.getByText("Total Expected")).toBeInTheDocument();
			expect(screen.getByText("Total Received")).toBeInTheDocument();
			expect(screen.getByText("Total Difference")).toBeInTheDocument();
		});
	});
});
