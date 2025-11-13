import React, { Component, ErrorInfo, ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log error to console for developers
		console.error("Error caught by ErrorBoundary:", error, errorInfo);
	}

	handleReload = (): void => {
		globalThis.location.reload();
	};

	render(): ReactNode {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "400px",
						p: 3,
					}}
				>
					<Paper
						elevation={2}
						sx={{
							p: 4,
							maxWidth: "500px",
							textAlign: "center",
						}}
					>
						<AlertTriangle size={48} color="var(--mui-palette-error-main)" style={{ marginBottom: "16px" }} />
						<Typography variant="h5" component="h2" gutterBottom>
							Something went wrong
						</Typography>
						<Typography variant="body1" color="text.secondary" paragraph>
							We&apos;re sorry, but we couldn&apos;t load this page.
						</Typography>
						<Button variant="contained" onClick={this.handleReload}>
							Reload
						</Button>
						{this.state.error && process.env.NODE_ENV !== "production" && (
							<Box sx={{ mt: 3, textAlign: "left", backgroundColor: "grey.100", p: 2, borderRadius: 1 }}>
								<Typography variant="caption" component="pre" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
									{this.state.error.toString()}
								</Typography>
							</Box>
						)}
					</Paper>
				</Box>
			);
		}

		return this.props.children;
	}
}
