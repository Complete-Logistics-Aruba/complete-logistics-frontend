import apiClient from "../api/api-client";

export interface User {
	email: string;
	roles: string[];
	name?: string;
}

export interface LoginResponse {
	access: string;
	user: User;
}

export interface LoginData {
	email: string;
	password: string;
}

export const authService = {
	// Helper function to generate a mock JWT token
	generateMockJwt(user: User): string {
		const header = btoa(
			JSON.stringify({
				alg: "HS256",
				typ: "JWT",
			})
		);

		const now = Math.floor(Date.now() / 1000);
		const payload = btoa(
			JSON.stringify({
				sub: user.email,
				name: user.name,
				roles: user.roles,
				iat: now,
				exp: now + 3600, // Token expires in 1 hour
				jti: Math.random().toString(36).slice(2),
			})
		);

		const signature = btoa(`mocked_signature_${Date.now()}`);
		return `${header}.${payload}.${signature}`;
	},
	async login(data: LoginData): Promise<LoginResponse> {
		try {
			console.log("Login attempt:", data.email);
			const response = await apiClient.post<LoginResponse>("/auth/login", data);

			// Store the token and user in localStorage
			localStorage.setItem("access_token", response.data.access);
			localStorage.setItem("user", JSON.stringify(response.data.user));

			console.log("Login successful");
			return response.data;
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	},

	async logout(): Promise<void> {
		try {
			await apiClient.post("/auth/logout");
		} catch (error) {
			console.error("Logout error", error);
		} finally {
			// Always clear local storage on logout
			localStorage.removeItem("access_token");
			localStorage.removeItem("user");
		}
	},

	async getCurrentUser(): Promise<User | null> {
		try {
			const response = await apiClient.get<User>("/me");
			return response.data;
		} catch {
			return null;
		}
	},

	isAuthenticated(): boolean {
		const token = localStorage.getItem("access_token");

		if (!token) {
			return false;
		}

		// Check if token has been refreshed in the last 30 minutes
		const refreshTime = localStorage.getItem("token_refresh_time");
		if (refreshTime) {
			const lastRefresh = Number.parseInt(refreshTime);
			const currentTime = Date.now();
			const minutesSinceRefresh = (currentTime - lastRefresh) / (1000 * 60);

			// If token is more than 30 minutes old, refresh it
			if (minutesSinceRefresh > 30) {
				console.log("Token is old, refreshing...");

				// Generate a fresh JWT token
				const user = this.getUser();
				if (user) {
					const newToken = this.generateMockJwt(user);
					localStorage.setItem("token_refresh_time", currentTime.toString());
					localStorage.setItem("access_token", newToken);
				}
			}
		} else {
			// Set initial refresh time if none exists
			localStorage.setItem("token_refresh_time", Date.now().toString());
		}

		return true;
	},

	getUser(): User | null {
		const userData = localStorage.getItem("user");
		return userData ? JSON.parse(userData) : null;
	},
};
