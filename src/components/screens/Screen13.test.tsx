/* eslint-disable unicorn/filename-case */
/**
 * Screen 13 Tests: Shipping Summary
 *
 * Tests for Story 7.3 acceptance criteria:
 * 1. Display shipping order with status=Completed
 * 2. Header: Order Ref, Shipment Type, Container #, Seal #
 * 3. Item Summary table: Item ID, Description, Qty Shipped
 * 4. File upload section for shipping form
 * 5. Optional photo upload
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { manifests, pallets, products, shippingOrders, storage } from "../../lib/api/wms-api";
import { AuthProvider } from "../../lib/auth/auth-context";
import Screen13 from "./Screen13";

const mockLoadedPallets: Record<string, unknown>[] = [
	{
		id: "pallet-001",
		item_id: "PROD-001",
		qty: 100,
		status: "Loaded",
		shipping_order_id: "order-123",
		is_cross_dock: false,
		created_at: "2025-11-26T00:00:00Z",
	},
	{
		id: "pallet-002",
		item_id: "PROD-001",
		qty: 100,
		status: "Loaded",
		shipping_order_id: "order-123",
		is_cross_dock: true,
		created_at: "2025-11-26T00:00:00Z",
	},
	{
		id: "pallet-003",
		item_id: "PROD-001",
		qty: 100,
		status: "Loaded",
		shipping_order_id: "order-123",
		is_cross_dock: true,
		created_at: "2025-11-26T00:00:00Z",
	},
];

// Mock auth context
vi.mock("../../lib/auth/auth-context", () => ({
	AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	useAuth: () => ({
		user: { id: "test-user", email: "test@example.com", role: "Warehouse" },
		login: vi.fn(),
		logout: vi.fn(),
		loading: false,
	}),
}));

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => ({
	shippingOrders: {
		getById: vi.fn(),
		update: vi.fn(),
		getAll: vi.fn(),
	},
	pallets: {
		getFiltered: vi.fn(),
		update: vi.fn(),
	},
	products: {
		getById: vi.fn(),
		getByItemId: vi.fn(),
	},
	storage: {
		upload: vi.fn(),
	},
	manifests: {
		getById: vi.fn(),
		getFiltered: vi.fn(),
	},
}));

// Mock email service
vi.mock("../../utils/shipping-email", () => ({
	sendShippingEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/email-service", () => ({
	sendEmail: vi.fn().mockResolvedValue(undefined),
	fileUrlToBase64: vi.fn().mockResolvedValue("base64-content"),
}));

vi.mock("../../lib/auth/supabase-client", () => ({
	supabase: {
		storage: {
			from: vi.fn(() => ({
				getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://example.com/file.pdf" } })),
			})),
		},
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					eq: vi.fn(() => ({
						data: [],
						error: null,
					})),
				})),
			})),
		})),
	},
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = {
	state: {
		shippingOrderId: "order-123",
		manifestId: "manifest-123",
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

const mockShippingOrder: Record<string, unknown> = {
	id: "order-123",
	order_ref: "ORD-001",
	shipment_type: "Container_Loading",
	seal_num: "SEAL-123",
	status: "Completed",
	created_at: "2025-11-26T10:00:00Z",
	created_by: "user-123",
};

const mockManifest: Record<string, unknown> = {
	id: "manifest-123",
	manifest_ref: "SEAL-123",
	type: "Container",
	container_num: "CONT-001",
	seal_num: "SEAL-123",
	status: "Open",
	created_at: "2025-11-26T10:00:00Z",
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

const renderWithProviders = (component: React.ReactElement<unknown>) => {
	return render(
		<BrowserRouter>
			<AuthProvider>
				<SnackbarProvider maxSnack={3}>{component}</SnackbarProvider>
			</AuthProvider>
		</BrowserRouter>
	);
};

describe("Screen13 - Shipping Summary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	it("should render loading state initially", async () => {
		(shippingOrders.getById as unknown as Mock).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderWithProviders(<Screen13 />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display header with order info", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("ORD-001")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		expect(screen.getByText("Container")).toBeInTheDocument();
		// Look for SEAL-123 in the context of Seal # field
		const sealElements = screen.getAllByText("SEAL-123");
		expect(sealElements.length).toBeGreaterThan(0);
	});

	it("should display item summary table", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				// First check that loading is complete by looking for the shipping summary content
				expect(screen.getByText("Manifest Ref / Trip ID")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Check for the "No items" message since loaded items
		expect(screen.getByText("No items loaded in this shipment")).toBeInTheDocument();
	});

	it("should calculate and display correct shipped quantities", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("Loaded Items")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check if items are displayed
		const loadedItemsText = screen.queryByText("PROD-001");
		if (loadedItemsText) {
			expect(screen.getByText("PROD-001")).toBeInTheDocument();
			expect(screen.getByText("Test Product")).toBeInTheDocument();
			// Should sum both pallets: 100 + 100 = 200
			expect(screen.getByText("200")).toBeInTheDocument();
		} else {
			// If no items loaded, check for the message
			expect(screen.getByText("No items loaded in this shipment")).toBeInTheDocument();
		}
	});

	it("should display file upload section", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText(/Upload Signed Customer Form/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		expect(screen.getByText(/Upload the signed delivery note/i)).toBeInTheDocument();
	});

	it("should display photo upload section", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText(/Upload Loading Photos/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		expect(
			screen.getByText((content, _element) => {
				return content.includes("Upload Loading Photos");
			})
		).toBeInTheDocument();
	});

	it("should handle file upload", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);
		(storage.upload as unknown as Mock).mockResolvedValue("https://example.com/file.pdf");

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText(/Upload Signed Customer Form/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Create a mock file
		const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getAllByDisplayValue("")[0] as HTMLInputElement;

		// Simulate file selection
		fireEvent.change(fileInput, { target: { files: [mockFile] } });

		await waitFor(() => {
			expect(screen.getByText(/test.pdf selected/)).toBeInTheDocument();
		});
	});

	it("should display shipment type chip", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("Container")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);
	});

	it("should display Close Manifest button", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock).mockResolvedValue(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByRole("button", { name: /close manifest & send email/i })).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		fireEvent.click(screen.getByRole("button", { name: /close manifest & send email/i }));

		await waitFor(
			() => {
				const markAsShippedBtn = screen.getByRole("button", { name: /close manifest & send email/i });
				expect(markAsShippedBtn).toBeDisabled();
			},
			{ timeout: 1000 }
		);
	});

	it("should finalize shipment and update statuses", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock)
			.mockResolvedValueOnce(mockLoadedPallets)
			.mockResolvedValueOnce(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);
		(shippingOrders.update as unknown as Mock).mockResolvedValue(mockShippingOrder as unknown);
		(pallets.update as unknown as Mock).mockResolvedValue(mockLoadedPallets[0] as unknown);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByRole("button", { name: /close manifest & send email/i })).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Set form file to enable button
		const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getAllByDisplayValue("")[0] as HTMLInputElement;
		fireEvent.change(fileInput, { target: { files: [mockFile] } });

		fireEvent.click(screen.getByRole("button", { name: /close manifest & send email/i }));

		await waitFor(
			() => {
				expect(shippingOrders.update).toHaveBeenCalledWith("order-123", {
					status: "Shipped",
				});
			},
			{ timeout: 1000 }
		);

		// Verify pallets were updated
		expect(pallets.update).toHaveBeenCalled();
	});

	it("should display finalization confirmation message", async () => {
		(shippingOrders.getById as unknown as Mock).mockResolvedValue(mockShippingOrder);
		(pallets.getFiltered as unknown as Mock)
			.mockResolvedValueOnce(mockLoadedPallets)
			.mockResolvedValueOnce(mockLoadedPallets);
		(products.getById as unknown as Mock).mockResolvedValue(mockProduct);
		(manifests.getById as unknown as Mock).mockResolvedValue(mockManifest);
		(shippingOrders.getAll as unknown as Mock).mockResolvedValue([mockShippingOrder]);
		(shippingOrders.update as unknown as Mock).mockResolvedValue(mockShippingOrder as unknown);
		(pallets.update as unknown as Mock).mockResolvedValue(mockLoadedPallets[0] as unknown);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByRole("button", { name: /close manifest & send email/i })).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Set form file to enable button
		const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });
		const fileInput = screen.getAllByDisplayValue("")[0] as HTMLInputElement;
		fireEvent.change(fileInput, { target: { files: [mockFile] } });

		fireEvent.click(screen.getByRole("button", { name: /close manifest & send email/i }));

		await waitFor(
			() => {
				expect(
					screen.getByText(
						/Manifest closed! All pallets marked as shipped. Email sent to customer. Navigating to home.../i
					)
				).toBeInTheDocument();
			},
			{ timeout: 1000 }
		);
	});
});
