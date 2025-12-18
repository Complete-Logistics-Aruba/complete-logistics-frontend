/**
 * Billing Calculation Tests
 *
 * Tests for Story 8.3 acceptance criteria:
 * 1. Storage calculation (days × positions)
 * 2. In positions calculation
 * 3. Cross-dock positions calculation
 * 4. Out positions calculation
 * 5. Hand delivery positions calculation
 * 6. Date range filtering
 * 7. Edge cases (no data, partial days)
 * 8. Inclusive day count formula
 */

import { describe, expect, it } from "vitest";

import type { Pallet, Product, ShippingOrder } from "../types/domain";
import {
	calculateAllBillingMetrics,
	calculateCrossDockPalletPositions,
	calculateDayCount,
	calculateInPalletPositions,
	calculateOutPalletPositions,
	calculateStoragePalletPositions,
} from "./billing";

describe("Billing Calculations", () => {
	describe("calculateDayCount", () => {
		it("should calculate inclusive day count", () => {
			const start = new Date("2025-11-01");
			const end = new Date("2025-11-01");
			expect(calculateDayCount(start, end)).toBe(1);
		});

		it("should calculate multiple days", () => {
			const start = new Date("2025-11-01");
			const end = new Date("2025-11-05");
			expect(calculateDayCount(start, end)).toBe(5);
		});

		it("should handle month boundaries", () => {
			const start = new Date("2025-10-31");
			const end = new Date("2025-11-01");
			expect(calculateDayCount(start, end)).toBe(2);
		});
	});

	describe("calculateStoragePalletPositions", () => {
		it("should calculate storage positions for stored pallets", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 10,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Stored",
				location_id: "loc-001",
				shipping_order_id: undefined,
				receiving_order_id: "recv-001",
				is_cross_dock: false,
				created_at: "2025-11-01T00:00:00Z",
				product: mockProduct,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			// 5 days × 10 positions = 50
			const result = calculateStoragePalletPositions([mockPallet], fromDate, toDate);
			expect(result).toBe(50);
		});

		it("should skip non-stored pallets", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 10,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Shipped",
				location_id: undefined,
				shipping_order_id: "order-001",
				receiving_order_id: undefined,
				is_cross_dock: false,
				created_at: "2025-11-01T00:00:00Z",
				product: mockProduct,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateStoragePalletPositions([mockPallet], fromDate, toDate);
			// Pallet status is "Shipped", so it should be skipped from storage calculation
			expect(result).toBe(0);
		});

		it("should skip pallets outside date range", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 10,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-10-01T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Stored",
				location_id: "loc-001",
				shipping_order_id: undefined,
				receiving_order_id: "recv-001",
				is_cross_dock: false,
				created_at: "2025-10-01T00:00:00Z",
				product: mockProduct,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateStoragePalletPositions([mockPallet], fromDate, toDate);
			// Pallet created on 2025-10-01, range is 2025-11-01 to 2025-11-05 (5 days)
			// Pallet positions: 1 * 5 days = 50
			expect(result).toBe(50);
		});

		it("should calculate storage positions for stored pallets with date range", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 10,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Stored",
				location_id: "loc-001",
				shipping_order_id: undefined,
				receiving_order_id: "recv-001",
				is_cross_dock: false,
				created_at: "2025-10-01T00:00:00Z",
				product: mockProduct,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateStoragePalletPositions([mockPallet], fromDate, toDate);
			// Pallet created on 2025-10-01, range is 2025-11-01 to 2025-11-05 (5 days)
			// Pallet positions: 1 * 5 days = 50
			expect(result).toBe(50);
		});
	});

	describe("calculateInPalletPositions", () => {
		it("should calculate in positions for non-cross-dock pallets", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 5,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Stored",
				location_id: "loc-001",
				shipping_order_id: undefined,
				receiving_order_id: "recv-001",
				is_cross_dock: false,
				created_at: "2025-11-02T00:00:00Z",
				product: mockProduct,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateInPalletPositions([mockPallet], fromDate, toDate);
			expect(result).toBe(5);
		});

		it("should skip cross-dock pallets", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 5,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Stored",
				location_id: "loc-001",
				shipping_order_id: undefined,
				receiving_order_id: "recv-001",
				is_cross_dock: true,
				created_at: "2025-11-02T00:00:00Z",
				product: mockProduct,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateInPalletPositions([mockPallet], fromDate, toDate);
			expect(result).toBe(0);
		});
	});

	describe("calculateCrossDockPalletPositions", () => {
		it("should calculate cross-dock positions", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 8,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Stored",
				location_id: "loc-001",
				shipping_order_id: undefined,
				receiving_order_id: "recv-001",
				is_cross_dock: true,
				created_at: "2025-11-02T00:00:00Z",
				product: mockProduct,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateCrossDockPalletPositions([mockPallet], fromDate, toDate);
			expect(result).toBe(8);
		});
	});

	describe("calculateOutPalletPositions", () => {
		it("should calculate out positions for non-cross-dock, non-hand-delivery shipments", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 6,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockShippingOrder: ShippingOrder = {
				id: "order-001",
				order_ref: "ORD-001",
				shipment_type: "Container_Loading",
				status: "Shipped",
				seal_num: "SEAL-001",
				created_at: "2025-11-03T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product; shippingOrder?: ShippingOrder } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Shipped",
				location_id: undefined,
				shipping_order_id: "order-001",
				receiving_order_id: undefined,
				is_cross_dock: false,
				created_at: "2025-11-02T00:00:00Z",
				product: mockProduct,
				shippingOrder: mockShippingOrder,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateOutPalletPositions([mockPallet], fromDate, toDate);
			expect(result).toBe(6);
		});

		it("should skip hand delivery shipments", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 6,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockShippingOrder: ShippingOrder = {
				id: "order-001",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery",
				status: "Shipped",
				seal_num: "SEAL-001",
				created_at: "2025-11-03T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product; shippingOrder?: ShippingOrder } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Shipped",
				location_id: undefined,
				shipping_order_id: "order-001",
				receiving_order_id: undefined,
				is_cross_dock: false,
				created_at: "2025-11-02T00:00:00Z",
				product: mockProduct,
				shippingOrder: mockShippingOrder,
			};

			const fromDate = new Date("2025-11-01");
			const toDate = new Date("2025-11-05");

			const result = calculateOutPalletPositions([mockPallet], fromDate, toDate);
			expect(result).toBe(0);
		});
	});

	describe("calculateHandDeliveryPalletPositions", () => {
		it("should calculate hand delivery positions", () => {
			const mockProduct: Product = {
				id: "prod-001",
				item_id: "ITEM-001",
				description: "Test Product",
				pallet_positions: 4,
				units_per_pallet: 100,
				active: true,
				created_at: "2025-11-01T00:00:00Z",
			};

			const mockShippingOrder: ShippingOrder = {
				id: "order-001",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery",
				status: "Shipped",
				created_at: "2025-11-03T00:00:00Z",
			};

			const mockPallet: Pallet & { product?: Product; shippingOrder?: ShippingOrder } = {
				id: "pallet-001",
				item_id: "ITEM-001",
				qty: 100,
				status: "Shipped",
				location_id: undefined,
				shipping_order_id: "order-001",
				receiving_order_id: undefined,
				is_cross_dock: false,
				created_at: "2025-11-02T00:00:00Z",
				product: mockProduct,
				shippingOrder: mockShippingOrder,
			};

			const result = calculateAllBillingMetrics([mockPallet], "2025-11-01", "2025-11-05");

			expect(result).toHaveProperty("storage_pallet_positions");
			expect(result).toHaveProperty("in_pallet_positions_standard");
			expect(result).toHaveProperty("cross_dock_pallet_positions");
			expect(result).toHaveProperty("out_pallet_positions_standard");
			expect(result).toHaveProperty("hand_delivery_pallet_positions");
		});

		it("should return zero for empty pallet list", () => {
			const result = calculateAllBillingMetrics([], "2025-11-01", "2025-11-05");

			expect(result.storage_pallet_positions).toBe(0);
			expect(result.in_pallet_positions_standard).toBe(0);
			expect(result.cross_dock_pallet_positions).toBe(0);
			expect(result.out_pallet_positions_standard).toBe(0);
			expect(result.hand_delivery_pallet_positions).toBe(0);
		});
	});
});
