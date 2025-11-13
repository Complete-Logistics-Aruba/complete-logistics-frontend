import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

interface AllTheProvidersProps {
	children: React.ReactNode;
}

// Custom wrapper that includes all providers needed for testing
const AllTheProviders = ({ children }: AllTheProvidersProps) => {
	return (
		<HelmetProvider>
			<MemoryRouter>{children}</MemoryRouter>
		</HelmetProvider>
	);
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
	render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything except render from testing-library
export type { RenderResult } from "@testing-library/react";
export { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

// Override the render method
export { customRender as render };
