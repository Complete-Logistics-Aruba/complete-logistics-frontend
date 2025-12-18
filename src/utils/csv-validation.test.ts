/**
 * CSV Validation Tests
 *
 * Comprehensive unit tests for CSV parsing and validation functions
 */

import { describe, expect, it } from "vitest";

import {
	parseCSV,
	readFileAsText,
	validateProductMasterCSV,
	validateReceivingOrderCSV,
	validateShippingOrderCSV,
} from "./csv-validation";

describe("CSV Validation Utilities", () => {
	describe("parseCSV", () => {
		it("should parse valid CSV content", () => {
			const csv = "item_id,description,units_per_pallet\nABC123,Widget A,10\nDEF456,Widget B,20";
			const result = parseCSV(csv);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				item_id: "ABC123",
				description: "Widget A",
				units_per_pallet: "10",
			});
			expect(result[1]).toEqual({
				item_id: "DEF456",
				description: "Widget B",
				units_per_pallet: "20",
			});
		});

		it("should throw error for CSV with no data rows", () => {
			const csv = "item_id,description,units_per_pallet";
			expect(() => parseCSV(csv)).toThrow("CSV must contain header and at least one data row");
		});

		it("should handle empty values", () => {
			const csv = "item_id,description,units_per_pallet\nABC123,,10";
			const result = parseCSV(csv);

			expect(result[0]).toEqual({
				item_id: "ABC123",
				description: "",
				units_per_pallet: "10",
			});
		});

		it("should trim whitespace from values", () => {
			const csv = "item_id,description,units_per_pallet\n ABC123 , Widget A , 10 ";
			const result = parseCSV(csv);

			expect(result[0]).toEqual({
				item_id: "ABC123",
				description: "Widget A",
				units_per_pallet: "10",
			});
		});
	});

	describe("readFileAsText", () => {
		it.skip("should read file content as text", async () => {
			const content = "item_id,description\nABC123,Widget A";
			const file = new File([content], "test.csv", { type: "text/csv" });

			const result = await readFileAsText(file);
			expect(result).toBe(content);
		});

		it.skip("should handle large files", async () => {
			const largeContent = "item_id,description\n" + "ABC123,Widget A\n".repeat(1000);
			const file = new File([largeContent], "large.csv", { type: "text/csv" });

			const result = await readFileAsText(file);
			expect(result).toContain("ABC123");
			expect(result.split("\n")).toHaveLength(1002); // header + 1000 rows + empty line
		});
	});

	describe.skip("validateProductMasterCSV", () => {
		it("should accept valid product master CSV", async () => {
			const content =
				"item_id,description,units_per_pallet,pallet_positions\nABC123,Widget A,10,1\nDEF456,Widget B,20,2";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.data).toHaveLength(2);
		});

		it("should reject non-CSV file", async () => {
			const file = new File(["content"], "test.txt", { type: "text/plain" });

			await expect(validateProductMasterCSV(file)).rejects.toThrow("File must be a CSV file");
		});

		it("should reject file exceeding 5MB", async () => {
			const largeContent = "x".repeat(6 * 1024 * 1024);
			const file = new File([largeContent], "large.csv", { type: "text/csv" });

			await expect(validateProductMasterCSV(file)).rejects.toThrow("File size exceeds 5MB limit");
		});

		it("should reject missing item_id", async () => {
			const content = "item_id,description,units_per_pallet\n,Widget A,10";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toEqual({
				row: 2,
				field: "item_id",
				message: "item_id is required",
			});
		});

		it("should accept missing description (optional field)", async () => {
			const content = "item_id,description,units_per_pallet\nABC123,,10";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject units_per_pallet <= 0", async () => {
			const content = "item_id,description,units_per_pallet\nABC123,Widget A,0";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("units_per_pallet");
			expect(result.errors[0].message).toContain("positive number");
		});

		it("should reject pallet_positions < 1", async () => {
			const content = "item_id,description,units_per_pallet,pallet_positions\nABC123,Widget A,10,0";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("pallet_positions");
			expect(result.errors[0].message).toContain(">= 1");
		});

		it("should collect multiple errors per row", async () => {
			const content = "item_id,description,units_per_pallet\n,Widget A,-5";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});

	describe.skip("validateReceivingOrderCSV", () => {
		const mockProducts = [
			{ item_id: "ABC123", units_per_pallet: 10, active: true },
			{ item_id: "DEF456", units_per_pallet: 20, active: true },
			{ item_id: "INACTIVE", units_per_pallet: 5, active: false },
		];

		it("should accept valid receiving order CSV", async () => {
			const content = "item_id,qty\nABC123,10\nDEF456,40";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.data).toHaveLength(2);
		});

		it("should reject non-existent item_id", async () => {
			const content = "item_id,qty\nXYZ999,10";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("item_id");
			expect(result.errors[0].message).toContain("not found in product master");
		});

		it("should reject inactive item_id", async () => {
			const content = "item_id,qty\nINACTIVE,5";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("item_id");
			expect(result.errors[0].message).toContain("is inactive");
		});

		it("should reject qty not multiple of units_per_pallet", async () => {
			const content = "item_id,qty\nABC123,15";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("qty");
			expect(result.errors[0].message).toContain("must be a multiple of 10");
		});

		it("should reject missing qty", async () => {
			const content = "item_id,qty\nABC123,";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("qty");
			expect(result.errors[0].message).toContain("required");
		});

		it("should reject qty <= 0", async () => {
			const content = "item_id,qty\nABC123,0";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("qty");
			expect(result.errors[0].message).toContain("> 0");
		});

		it("should reject negative qty", async () => {
			const content = "item_id,qty\nABC123,-10";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("qty");
			expect(result.errors[0].message).toContain("> 0");
		});

		it("should reject non-numeric qty", async () => {
			const content = "item_id,qty\nABC123,abc";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("qty");
			expect(result.errors[0].message).toContain("integer");
		});

		it("should reject missing item_id", async () => {
			const content = "item_id,qty\n,10";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("item_id");
			expect(result.errors[0].message).toContain("required");
		});

		it("should collect multiple errors from same row", async () => {
			const content = "item_id,qty\n,";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
			expect(result.errors.some((e) => e.field === "item_id")).toBe(true);
			expect(result.errors.some((e) => e.field === "qty")).toBe(true);
		});

		it("should collect errors from multiple rows", async () => {
			const content = "item_id,qty\nABC123,15\nXYZ999,10";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
			expect(result.errors.some((e) => e.row === 2)).toBe(true);
			expect(result.errors.some((e) => e.row === 3)).toBe(true);
		});

		it("should accept multiple valid rows", async () => {
			const content = "item_id,qty\nABC123,10\nABC123,20\nDEF456,40";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(true);
			expect(result.data).toHaveLength(3);
		});

		it("should have specific error messages", async () => {
			const content = "item_id,qty\nABC123,15";
			const file = new File([content], "receiving.csv", { type: "text/csv" });

			const result = await validateReceivingOrderCSV(file, mockProducts);

			expect(result.errors[0].message).toBe("qty must be a multiple of 10");
		});
	});

	describe.skip("validateShippingOrderCSV", () => {
		const mockProducts = [{ item_id: "ABC123" }, { item_id: "DEF456" }];

		it("should accept valid shipping order CSV", async () => {
			const content = "item_id,qty_ordered\nABC123,100\nDEF456,200";
			const file = new File([content], "shipping.csv", { type: "text/csv" });

			const result = await validateShippingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.data).toHaveLength(2);
		});

		it("should reject non-existent item_id", async () => {
			const content = "item_id,qty_ordered\nXYZ999,100";
			const file = new File([content], "shipping.csv", { type: "text/csv" });

			const result = await validateShippingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("item_id");
			expect(result.errors[0].message).toContain("not found in product master");
		});

		it("should reject missing qty_ordered", async () => {
			const content = "item_id,qty_ordered\nABC123,";
			const file = new File([content], "shipping.csv", { type: "text/csv" });

			const result = await validateShippingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("qty_ordered");
			expect(result.errors[0].message).toContain("required");
		});

		it("should reject qty_ordered <= 0", async () => {
			const content = "item_id,qty_ordered\nABC123,-10";
			const file = new File([content], "shipping.csv", { type: "text/csv" });

			const result = await validateShippingOrderCSV(file, mockProducts);

			expect(result.valid).toBe(false);
			expect(result.errors[0].field).toBe("qty_ordered");
			expect(result.errors[0].message).toContain("positive number");
		});
	});

	describe.skip("Edge cases", () => {
		it("should handle CSV with special characters", async () => {
			const content = 'item_id,description,units_per_pallet\nABC-123,Widget "A" & Co.,10';
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.data).toHaveLength(1);
		});

		it("should handle CSV with unicode characters", async () => {
			const content = "item_id,description,units_per_pallet\nABC123,Widget Ñ,10";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.data).toHaveLength(1);
		});

		it("should report correct row numbers", async () => {
			const content = "item_id,description,units_per_pallet\nABC123,Widget A,10\n,Widget B,20\nDEF456,Widget C,-5";
			const file = new File([content], "products.csv", { type: "text/csv" });

			const result = await validateProductMasterCSV(file);

			expect(result.errors.some((e) => e.row === 3)).toBe(true);
			expect(result.errors.some((e) => e.row === 4)).toBe(true);
		});
	});
});
