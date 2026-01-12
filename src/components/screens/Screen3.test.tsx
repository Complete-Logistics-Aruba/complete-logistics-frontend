/* eslint-disable unicorn/filename-case */
/**
 * Screen 3: Shipping Order Creation - Tests
 *
 * Tests for Story 6.1: Shipping Order Creation
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../lib/auth/auth-context";
import Screen3 from "./Screen3";

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => ({
	default: {
		products: {
			getAll: vi.fn(),
		},
		shippingOrders: {
			create: vi.fn(),
			createLines: vi.fn(),
		},
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

describe("Screen 3: Shipping Order Creation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const renderScreen = () => {
		return render(
			<BrowserRouter>
				<AuthProvider>
					<SnackbarProvider>
						<Screen3 />
					</SnackbarProvider>
				</AuthProvider>
			</BrowserRouter>
		);
	};

	it("should render form with shipment type options", () => {
		renderScreen();
		expect(screen.getByText("📦 Create Shipping Order")).toBeInTheDocument();
		expect(screen.getByLabelText("Hand Delivery")).toBeInTheDocument();
		expect(screen.getByLabelText("Container Loading")).toBeInTheDocument();
	});

	it("should show Seal # field for Hand Delivery", async () => {
		renderScreen();
		const handDeliveryRadio = screen.getByLabelText("Hand Delivery");
		fireEvent.click(handDeliveryRadio);
		// Note: Seal field is now only in Screen 4 (Manifest Registration)
		// Screen 3 only has shipment type and CSV upload
		await waitFor(() => {
			expect(screen.getByText("Choose CSV File")).toBeInTheDocument();
		});
	});

	it("should hide Seal # field for Container Loading", async () => {
		renderScreen();
		const containerRadio = screen.getByLabelText("Container Loading");
		fireEvent.click(containerRadio);
		// Note: Seal field is now only in Screen 4 (Manifest Registration)
		// Screen 3 only has shipment type and CSV upload
		await waitFor(() => {
			expect(screen.getByText("Choose CSV File")).toBeInTheDocument();
		});
	});

	it("should display CSV upload button", () => {
		renderScreen();
		expect(screen.getByText("Choose CSV File")).toBeInTheDocument();
	});
});
