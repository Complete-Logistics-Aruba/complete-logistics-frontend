import React, { useState } from "react";
import {
	Box,
	Button,
	Divider,
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

	// Always redirect to dashboard after login
	const dashboardPath = "/dashboard";

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

			// These are the valid test emails from the mock data
			const validTestEmails = [
				"claudio@complete.aw",
				"emelyn@complete.aw",
				"thais@complete.aw",
				"migna@complete.aw",
				"warehouse@complete.aw",
				"genilee@complete.aw",
			];

			if (!validTestEmails.includes(email)) {
				console.warn("Using a non-mocked email. Valid test emails are:", validTestEmails);
			}

			await login(email, password);

			// Get user name from email (before @ symbol)
			const name = email.split("@")[0];
			const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

			// Use standardized message template
			toast.success(`Welcome back, ${capitalizedName}.`);
			// Always redirect to dashboard after login
			navigate(dashboardPath, { replace: true });
		} catch (error_) {
			console.error("Login error:", error_);
			setError("Sign in failed. Check your email and password.");
			toast.error("Sign in failed. Check your email and password.");
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
						<Typography color="text.secondary" align="left" sx={{ mb: 3 }}>
							Don&apos;t have an account? <Link href="/auth/register">Sign up</Link>
						</Typography>

						<Box sx={{ width: "100%", mb: 3 }}>
							<Button
								fullWidth
								startIcon={<Box component="img" src="/assets/logo-google.svg" sx={{ height: 16 }} />}
								size="large"
								sx={{
									backgroundColor: "white",
									border: "1px solid",
									borderColor: "divider",
									color: "text.primary",
									mb: 2,
									"&:hover": {
										backgroundColor: "rgba(145, 158, 171, 0.08)",
									},
								}}
								variant="outlined"
							>
								Continue with Google
							</Button>
							<Button
								fullWidth
								startIcon={<Box component="img" src="/assets/logo-discord.svg" sx={{ height: 16 }} />}
								size="large"
								sx={{
									backgroundColor: "white",
									border: "1px solid",
									borderColor: "divider",
									color: "text.primary",
									"&:hover": {
										backgroundColor: "rgba(145, 158, 171, 0.08)",
									},
								}}
								variant="outlined"
							>
								Continue with Discord
							</Button>
						</Box>

						<Divider sx={{ my: 3, textAlign: "left" }}>or</Divider>

						<form onSubmit={handleLogin}>
							<Stack spacing={3}>
								<TextField
									fullWidth
									label="Email address"
									name="email"
									type="email"
									placeholder="claudio@complete.aw"
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
