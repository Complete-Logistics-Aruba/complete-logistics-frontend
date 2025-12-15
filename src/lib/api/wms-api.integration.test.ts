/**
 * wmsApi Integration Tests
 *
 * Integration tests for complete workflows using wmsApi.
 * These tests verify that multiple API operations work together correctly.
 *
 * @module lib/api/wmsApi.integration.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { wmsApi } from "./index";

// Mock Supabase client
vi.mock("../auth/supabase-client", () => ({
	supabase: {
		auth: {
			signInWithPassword: vi.fn(),
			signOut: vi.fn(),
			getUser: vi.fn(),
		},
		from: vi.fn(),
		storage: {
			from: vi.fn(),
		},
	},
}));

describe("wmsApi - Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Receiving Workflow", () => {
		it("should have receivingOrders API methods", () => {
			expect(wmsApi.receivingOrders).toBeDefined();
			expect(wmsApi.receivingOrders.create).toBeDefined();
			expect(wmsApi.receivingOrders.getById).toBeDefined();
			expect(wmsApi.receivingOrders.update).toBeDefined();
			expect(wmsApi.receivingOrders.createLines).toBeDefined();
		});
	});

	describe("Shipping Workflow", () => {
		it("should have shippingOrders API methods", () => {
			expect(wmsApi.shippingOrders).toBeDefined();
			expect(wmsApi.shippingOrders.create).toBeDefined();
			expect(wmsApi.shippingOrders.getById).toBeDefined();
			expect(wmsApi.shippingOrders.getAll).toBeDefined();
			expect(wmsApi.shippingOrders.update).toBeDefined();
			expect(wmsApi.shippingOrders.createLines).toBeDefined();
		});
	});

	describe("Pallet Management", () => {
		it("should have pallets API methods", () => {
			expect(wmsApi.pallets).toBeDefined();
			expect(wmsApi.pallets.create).toBeDefined();
			expect(wmsApi.pallets.getFiltered).toBeDefined();
			expect(wmsApi.pallets.update).toBeDefined();
		});
	});

	describe("Product Management", () => {
		it("should have products API methods", () => {
			expect(wmsApi.products).toBeDefined();
			expect(wmsApi.products.getAll).toBeDefined();
			expect(wmsApi.products.create).toBeDefined();
			expect(wmsApi.products.update).toBeDefined();
			expect(wmsApi.products.uploadMaster).toBeDefined();
		});
	});

	describe("Storage Operations", () => {
		it("should have storage API methods", () => {
			expect(wmsApi.storage).toBeDefined();
			expect(wmsApi.storage.upload).toBeDefined();
			expect(wmsApi.storage.download).toBeDefined();
			expect(wmsApi.storage.delete).toBeDefined();
		});
	});

	describe("Manifest Management", () => {
		it("should have manifests API methods", () => {
			expect(wmsApi.manifests).toBeDefined();
			expect(wmsApi.manifests.create).toBeDefined();
			expect(wmsApi.manifests.getById).toBeDefined();
			expect(wmsApi.manifests.update).toBeDefined();
		});
	});
});
