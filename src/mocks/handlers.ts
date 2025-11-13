// Mock API handlers for MSW
import { delay, http, HttpResponse } from "msw";

// Type definitions
interface User {
	email: string;
	name: string;
	roles: string[];
}

interface FCLShipment {
	id: string;
	reference: string;
	customer: string;
	status: "Draft" | "In Progress" | "Closed";
	updatedAt: string;
	issue_date?: string;
	due_date?: string;
	tax_id?: string;
	containers?: Array<{
		number?: string;
		pieces: number;
		weight_kg: number;
	}>;
}

interface LoginRequest {
	email: string;
	password: string;
}

interface LoginResponse {
	access: string;
	user: User;
}

interface ErrorResponse {
	message: string;
}

// Generic list response type
interface ListResponse<T = unknown> {
	results: T[];
	count: number;
}

interface AdminResponse {
	stats: {
		users: number;
		roles: number;
	};
}

// Get user-specific key for FCL shipments
const getUserFclKey = (userEmail?: string): string => {
	let email = userEmail;
	if (!email) {
		// Try to get from localStorage if not provided
		const userJson = localStorage.getItem("user");
		if (userJson) {
			try {
				const user = JSON.parse(userJson);
				email = user.email;
			} catch (error) {
				console.error("Error parsing user from localStorage:", error);
			}
		}
	}
	// Return user-specific key or fallback to default
	return email ? `fclShipments_${email}` : "fclShipments_guest";
};

// Initialize FCL shipments storage in localStorage if it doesn't exist
const initFclStorage = (userEmail?: string) => {
	const key = getUserFclKey(userEmail);
	const storedShipments = localStorage.getItem(key);
	if (!storedShipments) {
		localStorage.setItem(key, JSON.stringify([]));
	}
};

// Get FCL shipments from localStorage
const getFclShipments = (userEmail?: string): FCLShipment[] => {
	initFclStorage(userEmail);
	const key = getUserFclKey(userEmail);
	const storedShipments = localStorage.getItem(key);
	return storedShipments ? JSON.parse(storedShipments) : [];
};

// Add FCL shipment to localStorage
const addFclShipment = (shipment: FCLShipment, userEmail?: string): FCLShipment => {
	const shipments = getFclShipments(userEmail);
	shipments.push(shipment);
	const key = getUserFclKey(userEmail);
	localStorage.setItem(key, JSON.stringify(shipments));
	return shipment;
};

// Mock users from AUTH_SCOPE.md
const mockUsers: User[] = [
	{ email: "claudio@complete.aw", name: "Claudio Mata", roles: ["Admin"] },
	{ email: "emelyn@complete.aw", name: "Emelyn Bell", roles: ["Manager"] },
	{ email: "thais@complete.aw", name: "Thais Maduro", roles: ["Customer Service"] },
	{ email: "migna@complete.aw", name: "Migna Ras", roles: ["Accounting"] },
	{ email: "warehouse@complete.aw", name: "Eldrick Pontilius", roles: ["Warehouse"] },
	{ email: "genilee@complete.aw", name: "Genilee Thiel", roles: ["Brokerage"] },
];

// Helper function for standard responses
const createEmptyListResponse = async () => {
	// Add a small delay to simulate network latency
	await delay(100);
	return HttpResponse.json<ListResponse>({ results: [], count: 0 }, { status: 200 });
};

export const handlers = [
	// ===== AUTH ENDPOINTS =====
	// Login endpoint
	http.post<never, LoginRequest>("*/auth/login", async ({ request }) => {
		console.log("[MSW] Intercepted login request to:", request.url);
		let email = "";
		let password = "";

		try {
			const body = await request.json();
			email = body.email;
			password = body.password;
		} catch (error) {
			console.error("Error parsing request body:", error);
			return HttpResponse.json<ErrorResponse>({ message: "Invalid request format" }, { status: 400 });
		}

		console.log(`Login attempt: ${email}`);

		// Find user by email (case insensitive)
		const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

		// For testing purposes, accept any password as long as it's not empty
		if (user && password?.trim() !== "") {
			await delay(500);
			console.log(`Login success: ${email}`);

			// Generate a more realistic mock JWT token
			const generateMockJwt = (user: User) => {
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
			};

			const accessToken = generateMockJwt(user);

			return HttpResponse.json<LoginResponse>(
				{
					access: accessToken,
					user,
				},
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				}
			);
		}

		console.log(`Login failed: ${email}`);
		await delay(500);

		return HttpResponse.json<ErrorResponse>({ message: "Invalid email or password" }, { status: 401 });
	}),

	// Current user endpoint
	http.get<never, User | ErrorResponse>("*/me", async ({ request }) => {
		console.log("[MSW] Intercepted /me request to:", request.url);
		// Check for auth token
		const authHeader = request.headers.get("Authorization");

		if (!authHeader || !authHeader.includes("mock-token")) {
			return HttpResponse.json<ErrorResponse>({ message: "Unauthorized" }, { status: 401 });
		}

		// Get stored user from localStorage
		const userJson = localStorage.getItem("user");
		if (!userJson) {
			console.warn("[MSW] No user found in localStorage");
			return HttpResponse.json<ErrorResponse>({ message: "User not found" }, { status: 404 });
		}

		try {
			const user = JSON.parse(userJson);
			return HttpResponse.json<User>(user, { status: 200 });
		} catch (error) {
			console.error("[MSW] Error parsing user from localStorage:", error);
			return HttpResponse.json<ErrorResponse>({ message: "Invalid user data" }, { status: 500 });
		}
	}),

	// Logout endpoint
	http.post("*/auth/logout", async ({ request }) => {
		console.log("[MSW] Intercepted logout request to:", request.url);
		return HttpResponse.json<{ message: string }>({ message: "Logged out successfully" }, { status: 200 });
	}),

	// ===== SHIPPING ENDPOINTS =====
	// FCL Shipments - List
	http.get("*/fcl", async ({ request }) => {
		console.log("[MSW] Intercepted FCL list request:", request.url);

		// Get user email from auth header or user in localStorage
		let userEmail: string | undefined;
		const authHeader = request.headers.get("Authorization");
		if (authHeader) {
			const userJson = localStorage.getItem("user");
			if (userJson) {
				try {
					const user = JSON.parse(userJson);
					userEmail = user.email;
				} catch (error) {
					console.error("Error parsing user from localStorage:", error);
				}
			}
		}

		const shipments = getFclShipments(userEmail);
		await delay(300); // Simulate network delay
		return HttpResponse.json<ListResponse>({ results: shipments, count: shipments.length }, { status: 200 });
	}),

	// FCL Shipments - Create
	http.post("*/fcl", async ({ request }) => {
		console.log("[MSW] Intercepted FCL create request:", request.url);

		try {
			// Define the shape of the expected request
			interface FCLShipmentRequest {
				reference?: string;
				customer?: string;
				issue_date?: string;
				due_date?: string;
				tax_id?: string;
				containers?: Array<{ number?: string; pieces: number; weight_kg: number }>;
			}

			// Parse the request with a proper type
			const requestData = (await request.json()) as FCLShipmentRequest;
			// Generate an ID and add missing fields
			const newShipment: FCLShipment = {
				id: `FCL-${Date.now().toString().slice(-6)}`,
				reference: requestData.reference || "",
				customer: requestData.customer || "",
				status: "Draft",
				updatedAt: new Date().toISOString(),
				issue_date: requestData.issue_date,
				due_date: requestData.due_date,
				tax_id: requestData.tax_id,
				containers: requestData.containers || [],
			};

			// Get user email from localStorage
			let userEmail: string | undefined;
			const userJson = localStorage.getItem("user");
			if (userJson) {
				try {
					const user = JSON.parse(userJson);
					userEmail = user.email;
				} catch (error) {
					console.error("Error parsing user from localStorage:", error);
				}
			}

			// Add to user-specific storage
			addFclShipment(newShipment, userEmail);

			await delay(500); // Simulate network delay
			return HttpResponse.json(newShipment, { status: 201 });
		} catch (error) {
			console.error("Error creating FCL shipment:", error);
			return HttpResponse.json<ErrorResponse>({ message: "Error creating shipment" }, { status: 400 });
		}
	}),

	// Consolidation Shipments
	http.get("*/consolidation", async ({ request }) => {
		console.log("[MSW] Intercepted Consolidation request:", request.url);
		return createEmptyListResponse();
	}),

	// LCL Shipments
	http.get("*/lcl", async ({ request }) => {
		console.log("[MSW] Intercepted LCL request:", request.url);
		return createEmptyListResponse();
	}),

	// Air Shipments
	http.get("*/air", async ({ request }) => {
		console.log("[MSW] Intercepted Air request:", request.url);
		return createEmptyListResponse();
	}),

	// ===== BUSINESS ENDPOINTS =====
	// Invoicing
	http.get("*/invoicing", async ({ request }) => {
		console.log("[MSW] Intercepted Invoicing request:", request.url);
		return createEmptyListResponse();
	}),

	// Documents
	http.get("*/documents", async ({ request }) => {
		console.log("[MSW] Intercepted Documents request:", request.url);
		return createEmptyListResponse();
	}),

	// Data Management
	http.get("*/data", async ({ request }) => {
		console.log("[MSW] Intercepted Data Management request:", request.url);
		return createEmptyListResponse();
	}),

	// Admin
	http.get("*/admin", async ({ request }) => {
		console.log("[MSW] Intercepted Admin request:", request.url);
		await delay(100);
		return HttpResponse.json<AdminResponse>({ stats: { users: 0, roles: 0 } }, { status: 200 });
	}),
];
