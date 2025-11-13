import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const apiClient = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: false, // Set to true if using cookies for auth
});

// Request interceptor to add the auth token to requests
apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = localStorage.getItem("access_token");
		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error: AxiosError) => {
		throw error;
	}
);

// Track if we're already refreshing to prevent infinite loops
let isRefreshing = false;
let failedQueue: Array<{
	resolve: (token: string) => void;
	reject: (error: Error | unknown) => void;
}> = [];

const processQueue = (error: Error | unknown, token: string | null = null) => {
	for (const promise of failedQueue) {
		if (error) {
			promise.reject(error);
		} else if (token) {
			promise.resolve(token);
		}
	}
	failedQueue = [];
};

// Response interceptor for handling errors
apiClient.interceptors.response.use(
	(response: AxiosResponse) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as InternalAxiosRequestConfig;

		// Prevent infinite loops
		if (originalRequest._retry) {
			throw error;
		}

		// Handle unauthorized errors (401)
		if (error.response?.status === 401) {
			// If we're not already refreshing, try to refresh the token
			if (isRefreshing) {
				// If we are already refreshing, add this request to the queue
				return new Promise((resolve, reject) => {
					failedQueue.push({
						resolve: (token: string) => {
							if (originalRequest.headers) {
								originalRequest.headers.Authorization = `Bearer ${token}`;
							}
							resolve(apiClient(originalRequest));
						},
						reject: (err: Error | unknown) => {
							reject(err);
						},
					});
				});
			} else {
				isRefreshing = true;
				originalRequest._retry = true;

				try {
					// Get current user and generate a new JWT token
					const userJson = localStorage.getItem("user");
					let newToken = null;

					if (userJson) {
						try {
							const user = JSON.parse(userJson);

							// Generate a JWT token
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
							newToken = `${header}.${payload}.${signature}`;

							const currentTime = Date.now();
							localStorage.setItem("token_refresh_time", currentTime.toString());
							localStorage.setItem("access_token", newToken);
						} catch (error_) {
							console.error("Error generating new token:", error_);
						}
					}

					// Process the queue with the new token
					processQueue(null, newToken);

					// Retry the original request with the new token
					if (originalRequest.headers) {
						originalRequest.headers.Authorization = `Bearer ${newToken}`;
					}

					isRefreshing = false;
					return apiClient(originalRequest);
				} catch (refreshError) {
					// If refresh fails, process the queue with the error
					processQueue(refreshError, null);

					// Log out the user
					localStorage.removeItem("access_token");
					localStorage.removeItem("user");
					localStorage.removeItem("token_refresh_time");

					// Redirect to login
					console.log("Token refresh failed, redirecting to login");
					globalThis.location.href = "/auth/login";
					isRefreshing = false;

					throw refreshError;
				}
			}
		}

		throw error;
	}
);

export default apiClient;
