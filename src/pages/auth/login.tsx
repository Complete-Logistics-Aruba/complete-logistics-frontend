import React, { useState } from "react";
import {
	Box,
	Button,
	FormControl,
	IconButton,
	InputAdornment,
	InputLabel,
	Link,
	OutlinedInput,
	Stack,
	SvgIcon,
	TextField,
	Typography,
} from "@mui/material";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "@/components/core/toaster";

export function Page() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleLogin = async (event: React.FormEvent) => {
		event.preventDefault();
		setError("");

		if (!email) {
			setError("Email is required");
			return;
		}

		if (!password) {
			setError("Password is required");
			return;
		}

		setIsSubmitting(true);

		try {
			console.log("Submitting login form:", { email, password: "****" });

			// Use auth context for authentication
			const user = await login(email, password);
			console.log("Login successful, user:", user);

			// Check if user has a role
			if (!user.role) {
				setError("User role not found. Please contact your administrator.");
				toast.error("User role not found. Please contact your administrator.");
				setIsSubmitting(false);
				return;
			}

			// Show welcome message
			toast.success("Welcome back!");

			// Route to dashboard (role-based display handled by Dashboard component)
			navigate("/dashboard", { replace: true });
		} catch (error_) {
			console.error("Login error:", error_);
			const errorMessage = error_ instanceof Error ? error_.message : "Sign in failed. Check your email and password.";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	const toggleShowPassword = () => {
		setShowPassword(!showPassword);
	};

	return (
		<Box
			sx={{
				backgroundColor: "background.default",
				display: "flex",
				flex: "1 1 auto",
				height: "100vh",
			}}
		>
			<Box
				sx={{
					display: "flex",
					flex: "1 1 auto",
					flexDirection: {
						xs: "column",
						md: "row",
					},
				}}
			>
				{/* Left side - branding */}
				<Box
					sx={{
						backgroundColor: "neutral.800",
						color: "common.white",
						display: {
							xs: "none",
							md: "flex",
						},
						flex: "1 1 auto",
						p: 3,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<div>
						<Typography variant="h4" sx={{ mb: 2 }}>
							Welcome to Complete Logistics System
						</Typography>
						{/* <Typography
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              A professional template that comes with ready-to-use MUI components developed with one common goal in mind,
              help you build faster & beautiful applications.
            </Typography> */}
						{/* <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                mt: 6,
              }}
            >
              {['accenture', 'att', 'bolt', 'samsung', 'aws', 'vima'].map((logo) => (
                <Box
                  component="img"
                  key={logo}
                  src={`/assets/logo-${logo}.svg`}
                  sx={{
                    height: 42,
                    filter: 'brightness(0) invert(1)',
                    opacity: 0.6,
                  }}
                />
              ))}
            </Box> */}
					</div>
				</Box>

				{/* Right side - login form */}
				<Box
					sx={{
						backgroundColor: "background.paper",
						display: "flex",
						flex: "1 1 auto",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "flex-start",
						p: {
							xs: 4,
							sm: 6,
							md: 8,
						},
					}}
				>
					<Box sx={{ maxWidth: 550, width: "100%" }}>
						<Box sx={{ mb: 4, display: "flex", justifyContent: "center", width: "100%" }}>
							<Box component="img" src="/assets/logo_symbol.png" sx={{ height: 40 }} />
							<Typography variant="h5" component="span" sx={{ ml: 1, mt: 1, fontWeight: 500 }}>
								Complete Logistic System
							</Typography>
						</Box>
						<Typography variant="h4" align="left" sx={{ mb: 1 }}>
							Sign in
						</Typography>

						<form onSubmit={handleLogin}>
							<Stack spacing={3}>
								<TextField
									fullWidth
									label="Email address"
									name="email"
									type="email"
									placeholder=""
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
								<FormControl variant="outlined" fullWidth>
									<InputLabel htmlFor="password">Password</InputLabel>
									<OutlinedInput
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										endAdornment={
											<InputAdornment position="end">
												<IconButton onClick={toggleShowPassword} edge="end">
													<SvgIcon>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</SvgIcon>
												</IconButton>
											</InputAdornment>
										}
										label="Password"
									/>
								</FormControl>
							</Stack>

							{error && (
								<Typography color="error" sx={{ mt: 2 }}>
									{error}
								</Typography>
							)}

							<Box sx={{ display: "flex", justifyContent: "flex-start", mt: 2 }}>
								<Link href="/auth/forgot-password" variant="body2">
									Forgot password?
								</Link>
							</Box>

							<Button fullWidth size="large" sx={{ mt: 3 }} type="submit" variant="contained" disabled={isSubmitting}>
								{isSubmitting ? "Signing in..." : "Sign in"}
							</Button>
						</form>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
