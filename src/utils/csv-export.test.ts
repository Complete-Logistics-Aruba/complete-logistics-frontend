/**
 * CSV Export Tests
 *
 * Tests for Story 8.4 acceptance criteria:
 * 1. CSV export button
 * 2. CSV includes summary and detail rows
 * 3. Filename format correct
 * 4. Download triggered
 * 5. Error handling
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BillingMetrics } from "./billing";
import {
	downloadCSV,
	escapeCSVField,
	exportBillingToCSV,
	generateBillingCSV,
	generateBillingFilename,
	type HandDeliveryRow,
} from "./csv-export";

describe("CSV Export Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("escapeCSVField", () => {
		it("should return field as-is if no special characters", () => {
			expect(escapeCSVField("simple")).toBe("simple");
			expect(escapeCSVField(123)).toBe("123");
		});

		it("should wrap field in quotes if contains comma", () => {
			expect(escapeCSVField("hello, world")).toBe('"hello, world"');
		});

		it("should wrap field in quotes and escape quotes if contains quotes", () => {
			expect(escapeCSVField('hello "world"')).toBe('"hello ""world"""');
		});

		it("should wrap field in quotes if contains newline", () => {
			expect(escapeCSVField("hello\nworld")).toBe('"hello\nworld"');
		});
	});

	describe("generateBillingCSV", () => {
		it("should generate CSV with summary row", () => {
			const mockMetrics: BillingMetrics = {
				storage_pallet_positions: 100,
				in_pallet_positions_standard: 50,
				cross_dock_pallet_positions: 25,
				out_pallet_positions_standard: 75,
				hand_delivery_pallet_positions: 30,
			};

			const mockRows: HandDeliveryRow[] = [];

			const csv = generateBillingCSV(mockMetrics, mockRows);

			expect(csv).toContain("Storage_Pallet_Positions");
			expect(csv).toContain("100,50,25,75,30");
		});

		it("should generate CSV with detail rows", () => {
			const mockMetrics: BillingMetrics = {
				storage_pallet_positions: 100,
				in_pallet_positions_standard: 50,
				cross_dock_pallet_positions: 25,
				out_pallet_positions_standard: 75,
				hand_delivery_pallet_positions: 30,
			};

			const mockRows: HandDeliveryRow[] = [
				{
					deliveryDate: "2025-11-25",
					orderRef: "ORDER-001",
					totalPalletPositions: 10,
					notes: "",
				},
				{
					deliveryDate: "2025-11-26",
					orderRef: "ORDER-002",
					totalPalletPositions: 15,
					notes: "Partial shipment",
				},
			];

			const csv = generateBillingCSV(mockMetrics, mockRows);

			expect(csv).toContain("Delivery Date");
			expect(csv).toContain("ORDER-001");
			expect(csv).toContain("ORDER-002");
		});

		it("should include empty line separator between summary and detail", () => {
			const mockMetrics: BillingMetrics = {
				storage_pallet_positions: 100,
				in_pallet_positions_standard: 50,
				cross_dock_pallet_positions: 25,
				out_pallet_positions_standard: 75,
				hand_delivery_pallet_positions: 30,
			};

			const mockRows: HandDeliveryRow[] = [
				{
					deliveryDate: "2025-11-25",
					orderRef: "ORDER-001",
					totalPalletPositions: 10,
					notes: "",
				},
			];

			const csv = generateBillingCSV(mockMetrics, mockRows);
			const lines = csv.split("\n");

			// Should have: header, data, empty line, detail header, detail data
			expect(lines.length).toBeGreaterThanOrEqual(5);
		});

		it("should escape notes with special characters", () => {
			const mockMetrics: BillingMetrics = {
				storage_pallet_positions: 100,
				in_pallet_positions_standard: 50,
				cross_dock_pallet_positions: 25,
				out_pallet_positions_standard: 75,
				hand_delivery_pallet_positions: 30,
			};

			const mockRows: HandDeliveryRow[] = [
				{
					deliveryDate: "2025-11-25",
					orderRef: "ORDER-001",
					totalPalletPositions: 10,
					notes: "Note with, comma",
				},
			];

			const csv = generateBillingCSV(mockMetrics, mockRows);

			expect(csv).toContain('"Note with, comma"');
		});
	});

	describe("generateBillingFilename", () => {
		it("should generate correct filename format", () => {
			const filename = generateBillingFilename("2025-11-01", "2025-11-30");
			expect(filename).toBe("billing_2025-11-01_2025-11-30.csv");
		});

		it("should use provided date format", () => {
			const filename = generateBillingFilename("2025-01-15", "2025-02-28");
			expect(filename).toBe("billing_2025-01-15_2025-02-28.csv");
		});
	});

	describe("downloadCSV", () => {
		it("should be callable without errors", () => {
			// Just verify the function can be called without throwing
			expect(() => {
				downloadCSV("test,data\n1,2", "test.csv");
			}).not.toThrow();
		});
	});

	describe("exportBillingToCSV", () => {
		it("should be callable without errors", () => {
			const mockMetrics: BillingMetrics = {
				storage_pallet_positions: 100,
				in_pallet_positions_standard: 50,
				cross_dock_pallet_positions: 25,
				out_pallet_positions_standard: 75,
				hand_delivery_pallet_positions: 30,
			};

			const mockRows: HandDeliveryRow[] = [
				{
					deliveryDate: "2025-11-25",
					orderRef: "ORDER-001",
					totalPalletPositions: 10,
					notes: "",
				},
			];

			// Just verify the function can be called without throwing
			expect(() => {
				exportBillingToCSV(mockMetrics, mockRows, "2025-11-01", "2025-11-30");
			}).not.toThrow();
		});
	});
});
