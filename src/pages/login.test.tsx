/**
 * Login Page Tests
 *
 * Tests for authentication and login flow.
 *
 * @module pages/Login.test
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as authLib from "@/lib/auth";

import { LoginPage } from "./login";

// Mock the auth hook
vi.mock("@/lib/auth", () => ({
	useAuth: vi.fn(),
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => vi.fn(),
	};
});

describe("LoginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render login form", () => {
		(authLib.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: null,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn(),
		});

		render(
			<BrowserRouter>
				<LoginPage />
			</BrowserRouter>
		);

		expect(screen.getByText("Complete Logistics System")).toBeInTheDocument();
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Password")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
	});

	it("should validate email field", async () => {
		(authLib.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: null,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn(),
		});

		render(
			<BrowserRouter>
				<LoginPage />
			</BrowserRouter>
		);

		const submitButton = screen.getByRole("button", { name: /sign in/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
		});
	});

	it("should validate password field", async () => {
		(authLib.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: null,
			isLoading: false,
			login: vi.fn(),
			logout: vi.fn(),
		});

		render(
			<BrowserRouter>
				<LoginPage />
			</BrowserRouter>
		);

		const emailInput = screen.getByLabelText("Email");
		fireEvent.change(emailInput, { target: { value: "test@example.com" } });

		const submitButton = screen.getByRole("button", { name: /sign in/i });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
		});
	});

	it("should call login with valid credentials", async () => {
		const mockLogin = vi.fn();
		(authLib.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: null,
			isLoading: false,
			login: mockLogin,
			logout: vi.fn(),
		});

		render(
			<BrowserRouter>
				<LoginPage />
			</BrowserRouter>
		);

		const emailInput = screen.getByLabelText("Email");
		const passwordInput = screen.getByLabelText("Password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "password123" } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
		});
	});

	it("should display error message on login failure", async () => {
		const mockLogin = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
		(authLib.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: null,
			isLoading: false,
			login: mockLogin,
			logout: vi.fn(),
		});

		render(
			<BrowserRouter>
				<LoginPage />
			</BrowserRouter>
		);

		const emailInput = screen.getByLabelText("Email");
		const passwordInput = screen.getByLabelText("Password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "password123" } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
		});
	});

	it("should show loading state during login", async () => {
		const mockLogin = vi.fn(() => new Promise(() => {})); // Never resolves
		(authLib.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: null,
			isLoading: false,
			login: mockLogin,
			logout: vi.fn(),
		});

		render(
			<BrowserRouter>
				<LoginPage />
			</BrowserRouter>
		);

		const emailInput = screen.getByLabelText("Email");
		const passwordInput = screen.getByLabelText("Password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "password123" } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(/signing in/i)).toBeInTheDocument();
		});
	});
});
