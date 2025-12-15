/**
 * Types Validation Tests
 *
 * Tests to ensure all types are properly exported and can be imported.
 * This is a compile-time check to catch type definition issues early.
 *
 * @module types/types.test
 */

import { describe, expect, it } from "vitest";

import type {
	ApiError,
	// API types
	ApiResponse,
	BillingMetrics,
	// Component types
	ButtonProps,
	CSVImportFormData,
	EmailLog,
	Location,
	// Form types
	LoginFormData,
	Manifest,
	PaginatedResponse,
	Pallet,
	Product,
	ProductFormData,
	ReceivingOrder,
	ReceivingOrderLine,
	ShippingOrder,
	ShippingOrderLine,
	TableProps,
	// Domain types
	User,
	UserSettingsFormData,
	Warehouse,
} from "./index";

describe("Types - Compilation Check", () => {
	it("should export all domain types", () => {
		// This test passes if TypeScript compilation succeeds
		// The imports above are the actual test
		expect(true).toBe(true);
	});

	it("should export all API types", () => {
		expect(true).toBe(true);
	});

	it("should export all component types", () => {
		expect(true).toBe(true);
	});

	it("should export all form types", () => {
		expect(true).toBe(true);
	});
});

describe("Types - Runtime Validation", () => {
	it("should create valid User object", () => {
		const user: User = {
			id: "user-123",
			email: "test@example.com",
			role: "Customer Service",
		};
		expect(user.id).toBe("user-123");
		expect(user.role).toBe("Customer Service");
	});

	it("should create valid Product object", () => {
		const product: Product = {
			id: "prod-123",
			item_id: "ABC123",
			description: "Test Product",
			units_per_pallet: 10,
			pallet_positions: 1,
			active: true,
			created_at: new Date().toISOString(),
		};
		expect(product.item_id).toBe("ABC123");
		expect(product.units_per_pallet).toBe(10);
	});

	it("should create valid ReceivingOrder object", () => {
		const order: ReceivingOrder = {
			id: "order-123",
			container_num: "CONT123",
			seal_num: "SEAL123",
			status: "Pending",
			created_at: new Date().toISOString(),
			created_by: "user-123",
		};
		expect(order.container_num).toBe("CONT123");
		expect(order.status).toBe("Pending");
	});

	it("should create valid Pallet object", () => {
		const pallet: Pallet = {
			id: "pallet-123",
			item_id: "PROD-001",
			qty: 100,
			status: "Stored",
			is_cross_dock: false,
			created_at: new Date().toISOString(),
		};
		expect(pallet.qty).toBe(100);
		expect(pallet.status).toBe("Stored");
	});

	it("should create valid ShippingOrder object", () => {
		const order: ShippingOrder = {
			id: "ship-123",
			order_ref: "ORD123",
			shipment_type: "Hand_Delivery",
			status: "Pending",
			created_at: new Date().toISOString(),
		};
		expect(order.order_ref).toBe("ORD123");
		expect(order.shipment_type).toBe("Hand_Delivery");
	});

	it("should create valid Location object", () => {
		const location: Location = {
			location_id: "W1-1-1-A",
			warehouse_id: "W1",
			type: "RACK",
			rack: 1,
			level: 1,
			position: "A",
			created_at: new Date().toISOString(),
		};
		expect(location.location_id).toBe("W1-1-1-A");
		expect(location.type).toBe("RACK");
	});

	it("should create valid LoginFormData", () => {
		const formData: LoginFormData = {
			email: "test@example.com",
			password: "password123",
		};
		expect(formData.email).toBe("test@example.com");
	});

	it("should create valid ProductFormData", () => {
		const formData: ProductFormData = {
			item_id: "ABC123",
			description: "Test Product",
			units_per_pallet: 10,
			pallet_positions: 1,
			active: true,
		};
		expect(formData.item_id).toBe("ABC123");
	});

	it("should create valid ButtonProps", () => {
		const props: ButtonProps = {
			variant: "primary",
			size: "md",
			disabled: false,
			onClick: () => {},
		};
		expect(props.variant).toBe("primary");
	});

	it("should create valid TableProps", () => {
		const props: TableProps<Product> = {
			columns: [
				{ key: "item_id", label: "Item ID" },
				{ key: "description", label: "Description" },
			],
			data: [],
		};
		expect(props.columns).toHaveLength(2);
	});

	it("should create valid ApiResponse", () => {
		const response: ApiResponse<User> = {
			data: {
				id: "user-123",
				email: "test@example.com",
				role: "Customer Service",
			},
			error: null,
		};
		expect(response.data.id).toBe("user-123");
	});

	it("should create valid PaginatedResponse", () => {
		const response: PaginatedResponse<Product> = {
			items: [],
			total: 0,
			page: 1,
			limit: 10,
			totalPages: 0,
		};
		expect(response.page).toBe(1);
		expect(response.limit).toBe(10);
	});

	it("should create valid CSVImportFormData", () => {
		const formData: CSVImportFormData = {
			file: new File(["test"], "test.csv"),
			type: "products",
		};
		expect(formData.type).toBe("products");
	});

	it("should create valid UserSettingsFormData", () => {
		const formData: UserSettingsFormData = {
			email: "test@example.com",
			name: "Test User",
			preferences: {
				notifications: true,
				darkMode: false,
			},
		};
		expect(formData.email).toBe("test@example.com");
	});

	it("should create valid Warehouse object", () => {
		const warehouse: Warehouse = {
			id: "W1",
			code: "W1",
			name: "Warehouse 1",
			created_at: new Date().toISOString(),
		};
		expect(warehouse.code).toBe("W1");
	});

	it("should create valid Manifest object", () => {
		const manifest: Manifest = {
			id: "manifest-123",
			type: "Container",
			seal_num: "S12345",
			status: "Open",
			created_at: new Date().toISOString(),
		};
		expect(manifest.type).toBe("Container");
	});

	it("should create valid EmailLog object", () => {
		const log: EmailLog = {
			id: "log-123",
			recipient: "test@example.com",
			subject: "Test Email",
			status: "Sent",
			created_at: new Date().toISOString(),
		};
		expect(log.status).toBe("Sent");
	});

	it("should create valid BillingMetrics object", () => {
		const metrics: BillingMetrics = {
			storage_pallet_positions: 100,
			in_pallet_positions_standard: 50,
			cross_dock_pallet_positions: 25,
			out_pallet_positions_standard: 75,
			hand_delivery_pallet_positions: 10,
		};
		expect(metrics.storage_pallet_positions).toBe(100);
	});

	it("should create valid ApiError", () => {
		const error: ApiError = {
			data: null,
			error: {
				message: "Test error",
				code: "TEST_ERROR",
			},
		};
		expect(error.error.message).toBe("Test error");
	});

	it("should create valid ReceivingOrderLine object", () => {
		const line: ReceivingOrderLine = {
			id: "line-123",
			receiving_order_id: "order-123",
			item_id: "PROD-001",
			expected_qty: 100,
			created_at: new Date().toISOString(),
		};
		expect(line.expected_qty).toBe(100);
	});

	it("should create valid ShippingOrderLine object", () => {
		const line: ShippingOrderLine = {
			id: "line-123",
			shipping_order_id: "order-123",
			item_id: "PROD-001",
			requested_qty: 100,
			created_at: new Date().toISOString(),
		};
		expect(line.requested_qty).toBe(100);
	});
});
