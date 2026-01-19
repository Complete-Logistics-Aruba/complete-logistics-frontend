/* eslint-disable unicorn/filename-case */
/**
 * Screen 13 Tests: Manifests (Grid View)
 *
 * Tests for manifest-based grid view:
 * 1. Display all manifests (including Open ones)
 * 2. Show manifest details: Ref, Type, Status, Total Pallets
 * 3. Grid view with proper columns
 * 4. View Details action button
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { manifests } from "../../lib/api/wms-api";
import { AuthProvider } from "../../lib/auth/auth-context";
import Screen13 from "./Screen13";

// Mock auth context
vi.mock("../../lib/auth/auth-context", () => ({
	AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	useAuth: () => ({
		user: { id: "test-user", email: "test@example.com", role: "Customer Service" },
		login: vi.fn(),
		logout: vi.fn(),
		loading: false,
	}),
}));

// Mock wmsApi
vi.mock("../../lib/api/wms-api", () => ({
	manifests: {
		getAll: vi.fn(),
	},
}));

// Mock supabase client with proper pallet count responses
vi.mock("../../lib/auth/supabase-client", () => ({
	supabase: {
		from: vi.fn((table: string) => {
			if (table === "pallets") {
				return {
					select: vi.fn(() => ({
						eq: vi.fn(() => ({
							in: vi.fn(() => ({
								data: [{ id: "pallet-001" }, { id: "pallet-002" }],
								error: null,
							})),
						})),
					})),
				};
			}
			return {
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						in: vi.fn(() => ({
							data: [],
							error: null,
						})),
					})),
				})),
			};
		}),
	},
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const mockManifests: Record<string, unknown>[] = [
	{
		id: "manifest-001",
		type: "Hand",
		status: "Open",
		seal_num: "SEAL-001",
		container_num: null,
		created_at: "2025-11-26T10:00:00Z",
	},
	{
		id: "manifest-002",
		type: "Container",
		status: "Closed",
		seal_num: "SEAL-002",
		container_num: "CONT-002",
		created_at: "2025-11-26T11:00:00Z",
	},
	{
		id: "manifest-003",
		type: "Hand",
		status: "Cancelled",
		seal_num: "SEAL-003",
		container_num: null,
		created_at: "2025-11-26T12:00:00Z",
	},
];

const renderWithProviders = (component: React.ReactElement<unknown>) => {
	return render(
		<BrowserRouter>
			<AuthProvider>
				<SnackbarProvider maxSnack={3}>{component}</SnackbarProvider>
			</AuthProvider>
		</BrowserRouter>
	);
};

describe("Screen13 - Manifests Grid View", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNavigate.mockClear();
	});

	it("should render loading state initially", async () => {
		(manifests.getAll as unknown as Mock).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		renderWithProviders(<Screen13 />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should display manifests grid with all manifests", async () => {
		(manifests.getAll as unknown as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("🚛 Manifests")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check table headers
		expect(screen.getByText("Manifest Ref")).toBeInTheDocument();
		expect(screen.getByText("Type")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();
		expect(screen.getByText("Total Pallets")).toBeInTheDocument();
		expect(screen.getByText("Actions")).toBeInTheDocument();
	});

	it("should display Open manifests", async () => {
		(manifests.getAll as unknown as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("SEAL-001")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check for Open status chip
		const openChips = screen.getAllByText("Open");
		expect(openChips.length).toBeGreaterThan(0);
	});

	it("should display Closed manifests", async () => {
		(manifests.getAll as unknown as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("SEAL-002")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check for Closed status chip
		expect(screen.getByText("Closed")).toBeInTheDocument();
	});

	it("should display manifest types correctly", async () => {
		(manifests.getAll as unknown as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("🚛 Manifests")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check for Hand Delivery and Container chips
		const handDeliveryChips = screen.getAllByText("Hand Delivery");
		expect(handDeliveryChips.length).toBeGreaterThan(0);

		const containerChips = screen.getAllByText("Container");
		expect(containerChips.length).toBeGreaterThan(0);
	});

	it("should display View action buttons", async () => {
		(manifests.getAll as unknown as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText("🚛 Manifests")).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check for View buttons (one per manifest)
		const viewButtons = screen.getAllByRole("button", { name: /view/i });
		expect(viewButtons.length).toBe(3);
	});

	it("should display summary statistics", async () => {
		(manifests.getAll as unknown as Mock).mockResolvedValue(mockManifests);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText(/Total Manifests:/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		// Check summary shows correct counts
		expect(screen.getByText(/Total Manifests:/i)).toBeInTheDocument();
		expect(screen.getByText(/Open:/i)).toBeInTheDocument();
		expect(screen.getByText(/Closed:/i)).toBeInTheDocument();
		expect(screen.getByText(/Cancelled:/i)).toBeInTheDocument();
	});

	it("should show empty state when no manifests exist", async () => {
		(manifests.getAll as unknown as Mock).mockResolvedValue([]);

		renderWithProviders(<Screen13 />);

		await waitFor(
			() => {
				expect(screen.getByText(/No manifests found/i)).toBeInTheDocument();
			},
			{ timeout: 2000 }
		);

		expect(screen.getByText(/Create manifests on Screen 4/i)).toBeInTheDocument();
	});

	it("should handle errors gracefully", async () => {
		(manifests.getAll as unknown as Mock).mockRejectedValue(new Error("Failed to load manifests"));

		renderWithProviders(<Screen13 />);

		// Wait for error alert to appear using the ErrorOutlineIcon test id
		await waitFor(
			() => {
				const errorIcon = screen.getByTestId("ErrorOutlineIcon");
				expect(errorIcon).toBeInTheDocument();

				// Find the alert container that has this icon
				const errorAlert = errorIcon.closest('[role="alert"]');
				expect(errorAlert).toBeInTheDocument();
				expect(errorAlert).toHaveTextContent("Failed to load manifests");
			},
			{ timeout: 3000 }
		);
	});
});
