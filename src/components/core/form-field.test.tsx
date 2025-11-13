import React from "react";
import { TextField } from "@mui/material";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../test/utils";

// Simple FormField component test example
describe("FormField", () => {
	it("shows validation error text when provided", () => {
		// Arrange
		render(<TextField label="Test Field" error={true} helperText="This field is required" />);

		// Act - nothing to do, just rendering

		// Assert
		expect(screen.getByText("This field is required")).toBeInTheDocument();
		expect(screen.getByLabelText("Test Field")).toBeInTheDocument();
	});

	it("renders without error state when no error provided", () => {
		// Arrange
		render(<TextField label="Test Field" />);

		// Assert
		expect(screen.getByLabelText("Test Field")).toBeInTheDocument();
		expect(screen.queryByText("This field is required")).not.toBeInTheDocument();
	});
});
