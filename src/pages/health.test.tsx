/**
 * Health Check Page Tests
 *
 * Tests for health check functionality and Supabase connectivity verification.
 *
 * @module pages/Health.test
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiLib from "@/lib/api";

import { Health } from "./health";

// Mock the wmsApi
vi.mock("@/lib/api", () => ({
	wmsApi: {
		health: {
			check: vi.fn(),
		},
	},
}));

// Mock appConfig
vi.mock("@/config/app", () => ({
	appConfig: {
		name: "Complete Logistics System",
		envName: "local",
		themeColor: "#0B4EA2",
	},
}));

describe("Health Page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render health check page", () => {
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		render(<Health />);

		expect(screen.getByText("Health Check")).toBeInTheDocument();
		expect(screen.getByText("System status and connectivity verification")).toBeInTheDocument();
	});

	it("should show checking status initially", () => {
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		render(<Health />);

		expect(screen.getByText("Checking connectivity...")).toBeInTheDocument();
	});

	it("should show connected status on successful check", async () => {
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		render(<Health />);

		await waitFor(() => {
			expect(screen.getByText(/✓ Connected to Supabase/)).toBeInTheDocument();
		});
	});

	it("should show failed status on connection error", async () => {
		const errorMessage = "Connection refused";
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

		render(<Health />);

		await waitFor(() => {
			expect(screen.getByText(/✗ Failed to connect to Supabase/)).toBeInTheDocument();
			expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
		});
	});

	it("should refresh health check on button click", async () => {
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		render(<Health />);

		const refreshButton = screen.getByRole("button", { name: /Refresh Now/i });

		await waitFor(() => {
			expect(screen.getByText(/✓ Connected to Supabase/)).toBeInTheDocument();
		});

		fireEvent.click(refreshButton);

		await waitFor(() => {
			expect(apiLib.wmsApi.health.check).toHaveBeenCalledTimes(2);
		});
	});

	it("should toggle auto-refresh", async () => {
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		render(<Health />);

		const toggleButton = screen.getByRole("button", { name: /Disable Auto-refresh/i });

		expect(screen.getByText(/Auto-refresh: ON/)).toBeInTheDocument();

		fireEvent.click(toggleButton);

		await waitFor(() => {
			expect(screen.getByText(/Auto-refresh: OFF/)).toBeInTheDocument();
		});
	});

	it("should display last checked timestamp", async () => {
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

		render(<Health />);

		await waitFor(() => {
			expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
		});
	});

	it("should have refresh button disabled while checking", async () => {
		(apiLib.wmsApi.health.check as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		render(<Health />);

		const refreshButton = screen.getByRole("button", { name: /Refresh Now/i });

		expect(refreshButton).toBeDisabled();
	});
});
