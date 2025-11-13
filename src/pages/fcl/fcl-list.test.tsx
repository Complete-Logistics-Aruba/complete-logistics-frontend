import React from "react";
import axios from "axios";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/utils";
import { Page } from "./index";

// Mock axios
vi.mock("axios");

describe("FCL List Page", () => {
	it("renders an empty state when no shipments are available", async () => {
		// Mock axios.get to return empty results
		vi.mocked(axios.get).mockResolvedValue({
			data: { results: [], count: 0 },
		});

		// Arrange
		render(<Page />);

		// Assert - should show empty state
		// Wait for the component to finish loading
		expect(await screen.findByText(/No FCL shipments yet/i)).toBeInTheDocument();
	});
});
