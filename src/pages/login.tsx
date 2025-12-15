/**
 * Login Page
 *
 * Provides email/password authentication via Supabase.
 * Redirects authenticated users to their role-appropriate dashboard.
 *
 * @module pages/Login
 */
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Card, CircularProgress, Container, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginFormData } from "@/lib/validators";

/**
 * Login Page Component
 *
 * Handles user authentication with email/password.
 * Validates credentials via Supabase and checks user role.
 * Redirects to appropriate dashboard based on role.
 */
export function LoginPage() {
	const navigate = useNavigate();
	const { user, login } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	// Redirect if already authenticated
	useEffect(() => {
		if (user) {
			// Route to appropriate dashboard based on role
			if (user.role === "Customer Service") {
				navigate("/dashboard");
			} else if (user.role === "Warehouse") {
				navigate("/dashboard");
			}
		}
	}, [user, navigate]);

	/**
	 * Handle login form submission
	 */
	const onSubmit = async (data: LoginFormData) => {
		setIsLoading(true);
		setError(null);

		try {
			await login(data.email, data.password);
			// Redirect happens via useEffect when user state updates
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Login failed";
			setError(message);
			setIsLoading(false);
		}
	};

	return (
		<Container maxWidth="sm">
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "100vh",
					py: 4,
				}}
			>
				<Card
					sx={{
						width: "100%",
						p: 4,
						boxShadow: 3,
					}}
				>
					{/* Header */}
					<Stack spacing={3} sx={{ mb: 4 }}>
						<Typography variant="h4" component="h1" align="center" sx={{ fontWeight: "bold" }}>
							Complete Logistics System
						</Typography>
						<Typography variant="subtitle1" align="center" color="textSecondary">
							Sign in to your account
						</Typography>
					</Stack>

					{/* Error Alert */}
					{error && (
						<Alert severity="error" sx={{ mb: 3 }}>
							{error}
						</Alert>
					)}

					{/* Login Form */}
					<form onSubmit={handleSubmit(onSubmit)}>
						<Stack spacing={3}>
							{/* Email Field */}
							<TextField
								fullWidth
								label="Email"
								type="email"
								placeholder="Enter your email"
								{...register("email")}
								error={!!errors.email}
								helperText={errors.email?.message}
								disabled={isLoading}
								autoComplete="email"
							/>

							{/* Password Field */}
							<TextField
								fullWidth
								label="Password"
								type="password"
								placeholder="Enter your password"
								{...register("password")}
								error={!!errors.password}
								helperText={errors.password?.message}
								disabled={isLoading}
								autoComplete="current-password"
							/>

							{/* Submit Button */}
							<Button fullWidth variant="contained" size="large" type="submit" disabled={isLoading} sx={{ py: 1.5 }}>
								{isLoading ? (
									<>
										<CircularProgress size={20} sx={{ mr: 1 }} />
										Signing in...
									</>
								) : (
									"Sign In"
								)}
							</Button>
						</Stack>
					</form>

					{/* Footer */}
					<Typography variant="caption" align="center" sx={{ display: "block", mt: 4, color: "textSecondary" }}>
						For demo purposes, use test credentials provided by your administrator.
					</Typography>
				</Card>
			</Box>
		</Container>
	);
}

export default LoginPage;
