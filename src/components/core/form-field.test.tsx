import React from "react";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../test/utils";
import { FormField } from "./form-field";

describe("FormField", () => {
	it("shows validation error text when provided", () => {
		// Arrange
		render(<FormField label="Test Field" error={true} helperText="This field is required" />);

		// Act - nothing to do, just rendering

		// Assert
		const helperTextElement = screen.getByText("This field is required");
		expect(helperTextElement).toBeInTheDocument();
		
		// Find the input field by its role
		const inputField = screen.getByRole("textbox", { name: /test field/i });
		expect(inputField).toBeInTheDocument();
		
		// Verify error state
		expect(helperTextElement.className).toContain("Mui-error");
	});

	it("renders without error state when no error provided", () => {
		// Arrange
		render(<FormField label="Test Field" />);

		// Assert
		const inputField = screen.getByRole("textbox", { name: /test field/i });
		expect(inputField).toBeInTheDocument();
		expect(screen.queryByText("This field is required")).not.toBeInTheDocument();
		
		// Verify the form control doesn't have the error class
		const formControl = inputField.closest('div')?.parentElement;
		expect(formControl?.className).not.toContain("Mui-error");
	});
	
	it("renders with different helper text when not in error state", () => {
		// Arrange
		render(<FormField label="Test Field" helperText="Helper information" />);

		// Assert
		const helperText = screen.getByText("Helper information");
		expect(helperText).toBeInTheDocument();
		expect(helperText.className).not.toContain("Mui-error");
		
		// Verify input exists
		const inputField = screen.getByRole("textbox", { name: /test field/i });
		expect(inputField).toBeInTheDocument();
	});

	it("passes through additional props to TextField", () => {
		// Arrange
		render(<FormField label="Test Field" placeholder="Enter value" required />);

		// Assert
		// Find the input element directly
		const inputElement = screen.getByPlaceholderText("Enter value");
		expect(inputElement).toHaveAttribute('placeholder', 'Enter value');
		expect(inputElement).toBeRequired();
	});
	
	it("shows a more complex validation error message", () => {
		// Arrange
		render(
			<FormField 
				label="Email" 
				error={true} 
				helperText="Please enter a valid email address"
				required
			/>
		);

		// Assert
		const helperTextElement = screen.getByText("Please enter a valid email address");
		expect(helperTextElement).toBeInTheDocument();
		expect(helperTextElement.className).toContain("Mui-error");
		
		// Verify input is required
		const inputField = screen.getByRole("textbox", { name: /email/i });
		expect(inputField).toBeRequired();
	});
});
