/* eslint-disable unicorn/filename-case */
import React from "react";
import { render, screen } from "@testing-library/react";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wmsApi as _wmsApi } from "@/lib/api";

import { Screen6 } from "./Screen6";

// Mock wmsApi
vi.mock("@/lib/api", () => ({
	wmsApi: {
		storage: {
			upload: vi.fn().mockResolvedValue("mocked-path.jpg"),
		},
		receivingOrders: {
			update: vi.fn().mockResolvedValue({}),
		},
	},
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useLocation: () => ({
			state: {
				receivingOrderId: "rec-123",
				containerNum: "CONT-123",
				sealNum: "SEAL-456",
			},
		}),
	};
});

describe("Screen6 - Container Photos", () => {
	const renderComponent = () => {
		return render(
			<BrowserRouter>
				<SnackbarProvider>
					<Screen6 />
				</SnackbarProvider>
			</BrowserRouter>
		);
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		renderComponent();
		// Component should render successfully
		expect(document.body).toBeInTheDocument();
	});

	it("displays container photos heading", () => {
		renderComponent();
		// Check for main heading or title
		const headings = screen.getAllByRole("heading");
		expect(headings.length).toBeGreaterThan(0);
	});

	it("has upload buttons", () => {
		renderComponent();
		// Check for upload/capture buttons
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThan(0);
	});

	it("displays photo-related content", () => {
		renderComponent();
		// Check that photo-related text exists somewhere
		const photoElements = screen.queryAllByText(/photo/i);
		expect(photoElements.length).toBeGreaterThan(0);
	});
});
