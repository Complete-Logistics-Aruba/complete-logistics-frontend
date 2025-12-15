/**
 * Screen 9: Pending Shipping Orders - Tests
 *
 * Tests for Story 6.0: Pending Shipping Orders
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as wmsApi from "../../lib/api/wms-api";
import type { ShippingOrder } from "../../types/domain";
import Screen9 from "./screen9";

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => {
	const shippingOrdersMock = {
		getAll: vi.fn(),
	};
	return {
		shippingOrders: shippingOrdersMock,
		default: {
			shippingOrders: shippingOrdersMock,
		},
	};
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

describe("Screen 9: Pending Shipping Orders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const renderScreen = () => {
		return render(
			<BrowserRouter>
				<SnackbarProvider>
					<Screen9 />
				</SnackbarProvider>
			</BrowserRouter>
		);
	};

	it("should render loading state initially", () => {
		vi.mocked(wmsApi.shippingOrders.getAll).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderScreen();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display header", async () => {
		vi.mocked(wmsApi.shippingOrders.getAll).mockResolvedValue([]);

		renderScreen();

		// Wait for loading to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.getByText(/Pending Shipping Orders/i)).toBeInTheDocument();
	});

	it("should display empty state when no orders", async () => {
		vi.mocked(wmsApi.shippingOrders.getAll).mockResolvedValue([]);

		renderScreen();

		// Wait for loading to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.getByText(/No Pending Orders/i)).toBeInTheDocument();
	});

	it("should display order cards", async () => {
		const mockOrders: ShippingOrder[] = [
			{
				id: "order-1",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery",
				status: "Pending",
				created_at: "2025-11-26T10:00:00Z",
			},
		];

		vi.mocked(wmsApi.shippingOrders.getAll).mockResolvedValue(mockOrders);

		renderScreen();

		// Wait for loading to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.getByText("ORD-001")).toBeInTheDocument();
		expect(screen.getByText(/Hand Delivery/i)).toBeInTheDocument();
	});

	it("should display order count", async () => {
		const mockOrders: ShippingOrder[] = [
			{
				id: "order-1",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery",
				status: "Pending",
				created_at: "2025-11-26T10:00:00Z",
			},
			{
				id: "order-2",
				order_ref: "ORD-002",
				shipment_type: "Container_Loading",
				status: "Picking",
				created_at: "2025-11-26T10:05:00Z",
			},
		];

		vi.mocked(wmsApi.shippingOrders.getAll).mockResolvedValue(mockOrders);

		renderScreen();

		// Wait for loading to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.getByText(/2 orders waiting to be picked/i)).toBeInTheDocument();
	});

	it("should filter for Pending and Picking status only", async () => {
		const mockOrders: ShippingOrder[] = [
			{
				id: "order-1",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery",
				status: "Pending",
				created_at: "2025-11-26T10:00:00Z",
			},
			{
				id: "order-2",
				order_ref: "ORD-002",
				shipment_type: "Container_Loading",
				status: "Loading", // Should be filtered out
				created_at: "2025-11-26T10:05:00Z",
			},
			{
				id: "order-3",
				order_ref: "ORD-003",
				shipment_type: "Hand_Delivery",
				status: "Picking",
				created_at: "2025-11-26T10:10:00Z",
			},
		];

		vi.mocked(wmsApi.shippingOrders.getAll).mockResolvedValue(mockOrders);

		renderScreen();

		// Wait for loading to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.getByText("ORD-001")).toBeInTheDocument();
		expect(screen.getByText("ORD-003")).toBeInTheDocument();
		expect(screen.queryByText("ORD-002")).not.toBeInTheDocument();
	});

	it("should have Start Picking button on each card", async () => {
		const mockOrders: ShippingOrder[] = [
			{
				id: "order-1",
				order_ref: "ORD-001",
				shipment_type: "Hand_Delivery",
				status: "Pending",
				created_at: "2025-11-26T10:00:00Z",
			},
		];

		vi.mocked(wmsApi.shippingOrders.getAll).mockResolvedValue(mockOrders);

		renderScreen();

		// Wait for loading to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.getByText(/Start Picking/i)).toBeInTheDocument();
	});
});
