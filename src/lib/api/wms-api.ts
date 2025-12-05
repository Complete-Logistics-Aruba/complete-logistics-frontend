/**
 * WMS API Wrapper
 *
 * This is the single point of contact for all backend operations.
 * Components NEVER import Supabase directly; they only use wmsApi.
 *
 * Benefits:
 * - Centralized error handling
 * - Consistent API across the app
 * - Easy backend migration (swap Supabase for another backend)
 * - Type-safe operations
 * - Testable mock implementations
 *
 * @module lib/api/wmsApi
 */

import type {
	Location,
	Manifest,
	Pallet,
	Product,
	ReceivingOrder,
	ReceivingOrderLine,
	ShippingOrder,
	ShippingOrderLine,
	User,
	Warehouse,
} from "../../types/domain";
import { supabase } from "../auth/supabase-client";

/**
 * Format error message for user display
 *
 * @param error - Error object from Supabase
 * @param defaultMessage - Default message if error is unclear
 * @returns User-friendly error message
 */
function formatErrorMessage(error: unknown, defaultMessage: string): string {
	if (error instanceof Error) {
		// Supabase error
		if ("message" in error && typeof error.message === "string") {
			return error.message;
		}
		return error.message || defaultMessage;
	}
	return defaultMessage;
}

/**
 * Authentication Operations
 */
export const auth = {
	/**
	 * Login with email and password
	 *
	 * @param email - User email
	 * @param password - User password
	 * @returns User object with profile data
	 * @throws Error with user-friendly message
	 */
	async login(email: string, password: string): Promise<User> {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				throw new Error(error.message === "Invalid login credentials" ? "Invalid email or password" : error.message);
			}

			if (!data.user) {
				throw new Error("Login failed: no user returned");
			}

			// Fetch user profile with role
			const { data: profile, error: profileError } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", data.user.id)
				.single();

			if (profileError) {
				throw new Error("Failed to load user profile");
			}

			return {
				id: data.user.id,
				email: data.user.email || "",
				role: profile?.role || "Warehouse",
			};
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Login failed"));
		}
	},

	/**
	 * Logout current user
	 *
	 * @throws Error with user-friendly message
	 */
	async logout(): Promise<void> {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				throw error;
			}
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Logout failed"));
		}
	},

	/**
	 * Get current authenticated user
	 *
	 * @returns User object or null if not authenticated
	 */
	async getCurrentUser(): Promise<User | null> {
		try {
			const { data, error } = await supabase.auth.getUser();

			if (error || !data.user) {
				return null;
			}

			// Fetch user profile with role
			const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();

			return {
				id: data.user.id,
				email: data.user.email || "",
				role: profile?.role || "Warehouse",
			};
		} catch (error) {
			console.error("Failed to get current user:", error);
			return null;
		}
	},
};

/**
 * Product Operations
 */
export const products = {
	/**
	 * Get all products
	 *
	 * @returns Array of products
	 * @throws Error with user-friendly message
	 */
	async getAll(): Promise<Product[]> {
		try {
			const { data, error } = await supabase.from("products").select("*").order("item_id", { ascending: true });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load products"));
		}
	},

	/**
	 * Get single product by ID
	 *
	 * @param id - Product ID
	 * @returns Product object
	 * @throws Error with user-friendly message
	 */
	async getById(id: string): Promise<Product> {
		try {
			const { data, error } = await supabase.from("products").select("*").eq("id", id).single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Product not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load product"));
		}
	},

	/**
	 * Create new product
	 *
	 * @param product - Product data
	 * @returns Created product
	 * @throws Error with user-friendly message
	 */
	async create(product: Omit<Product, "id" | "created_at">): Promise<Product> {
		try {
			const { data, error } = await supabase.from("products").insert([product]).select().single();

			if (error) {
				// Log detailed error for debugging
				console.error("Supabase insert error:", error);
				throw error;
			}

			if (!data) {
				throw new Error("Failed to create product - no data returned");
			}

			return data;
		} catch (error) {
			const message = formatErrorMessage(error, "Failed to create product");
			console.error("Product creation error:", message, "Product:", product);
			throw new Error(message);
		}
	},

	/**
	 * Update product
	 *
	 * @param itemId - Product item_id (primary key)
	 * @param updates - Partial product data to update
	 * @returns Updated product
	 * @throws Error with user-friendly message
	 */
	async update(itemId: string, updates: Partial<Product>): Promise<Product> {
		try {
			const { data, error } = await supabase.from("products").update(updates).eq("item_id", itemId).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Product not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to update product"));
		}
	},

	/**
	 * Get product by item_id
	 *
	 * @param item_id - Product item ID
	 * @returns Product
	 * @throws Error with user-friendly message
	 */
	async getByItemId(item_id: string): Promise<Product> {
		try {
			const { data, error } = await supabase.from("products").select("*").eq("item_id", item_id).single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error(`Product with item_id "${item_id}" not found`);
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to get product"));
		}
	},

	/**
	 * Upload product master CSV
	 *
	 * @param file - CSV file
	 * @returns Array of created products
	 * @throws Error with user-friendly message
	 */
	async uploadMaster(file: File): Promise<Product[]> {
		try {
			// This will be implemented by the CSV parsing utility
			// For now, just validate file type
			if (!file.name.endsWith(".csv")) {
				throw new Error("File must be CSV format");
			}

			// File will be parsed and validated by csvValidation utility
			// Then inserted via products.create()
			return [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to upload product master"));
		}
	},
};

/**
 * Receiving Order Line Operations
 */
export const receivingOrderLines = {
	/**
	 * Create receiving order line
	 *
	 * @param line - Receiving order line data
	 * @returns Created receiving order line
	 * @throws Error with user-friendly message
	 */
	async create(line: Omit<ReceivingOrderLine, "id" | "created_at">): Promise<ReceivingOrderLine> {
		try {
			const { data, error } = await supabase.from("receiving_order_lines").insert([line]).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Failed to create receiving order line");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to create receiving order line"));
		}
	},

	/**
	 * Get receiving order lines by receiving order ID
	 *
	 * @param receivingOrderId - Receiving order ID
	 * @returns Array of receiving order lines
	 * @throws Error with user-friendly message
	 */
	async getByReceivingOrderId(receivingOrderId: string): Promise<ReceivingOrderLine[]> {
		try {
			const { data, error } = await supabase
				.from("receiving_order_lines")
				.select("*")
				.eq("receiving_order_id", receivingOrderId);

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load receiving order lines"));
		}
	},
};

/**
 * Receiving Order Operations
 */
export const receivingOrders = {
	/**
	 * Create receiving order
	 *
	 * @param order - Receiving order data
	 * @returns Created receiving order
	 * @throws Error with user-friendly message
	 */
	async create(order: Omit<ReceivingOrder, "id" | "created_at" | "updated_at">): Promise<ReceivingOrder> {
		try {
			const { data, error } = await supabase.from("receiving_orders").insert([order]).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Failed to create receiving order");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to create receiving order"));
		}
	},

	/**
	 * Get receiving order by ID
	 *
	 * @param id - Receiving order ID
	 * @returns Receiving order with lines
	 * @throws Error with user-friendly message
	 */
	async getById(id: string): Promise<ReceivingOrder & { lines: ReceivingOrderLine[] }> {
		try {
			const { data, error } = await supabase
				.from("receiving_orders")
				.select("*, receiving_order_lines(*)")
				.eq("id", id)
				.single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Receiving order not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load receiving order"));
		}
	},

	/**
	 * Update receiving order
	 *
	 * @param id - Receiving order ID
	 * @param updates - Partial receiving order data
	 * @returns Updated receiving order
	 * @throws Error with user-friendly message
	 */
	async update(id: string, updates: Partial<ReceivingOrder>): Promise<ReceivingOrder> {
		try {
			const { data, error } = await supabase.from("receiving_orders").update(updates).eq("id", id).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Receiving order not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to update receiving order"));
		}
	},

	/**
	 * Create receiving order lines
	 *
	 * @param lines - Array of receiving order lines
	 * @returns Created lines
	 * @throws Error with user-friendly message
	 */
	async createLines(lines: Omit<ReceivingOrderLine, "id">[]): Promise<ReceivingOrderLine[]> {
		try {
			const { data, error } = await supabase.from("receiving_order_lines").insert(lines).select();

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to create receiving order lines"));
		}
	},

	/**
	 * List all receiving orders
	 *
	 * @returns Array of receiving orders with lines
	 * @throws Error with user-friendly message
	 */
	async list(): Promise<(ReceivingOrder & { lines?: ReceivingOrderLine[] })[]> {
		try {
			const { data, error } = await supabase
				.from("receiving_orders")
				.select("*, receiving_order_lines(*)")
				.order("created_at", { ascending: false });

			if (error) {
				throw error;
			}

			// Map receiving_order_lines to lines for consistency
			const mappedData = (data || []).map((order: ReceivingOrder) => ({
				...order,
				lines: order.lines || [],
			}));

			return mappedData;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load receiving orders"));
		}
	},
};

/**
 * Pallet Operations
 */
export const pallets = {
	/**
	 * Create pallet
	 *
	 * @param pallet - Pallet data
	 * @returns Created pallet
	 * @throws Error with user-friendly message
	 */
	async create(pallet: Omit<Pallet, "id" | "created_at">): Promise<Pallet> {
		try {
			const { data, error } = await supabase.from("pallets").insert([pallet]).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Failed to create pallet");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to create pallet"));
		}
	},

	/**
	 * Get pallets with filters
	 *
	 * @param filters - Filter criteria
	 * @returns Array of pallets
	 * @throws Error with user-friendly message
	 */
	async getFiltered(filters: {
		status?: string;
		receiving_order_id?: string;
		shipping_order_id?: string;
		location_id?: string;
	}): Promise<Pallet[]> {
		try {
			let query = supabase.from("pallets").select("*");

			if (filters.status) {
				query = query.eq("status", filters.status);
			}
			if (filters.receiving_order_id) {
				query = query.eq("receiving_order_id", filters.receiving_order_id);
			}
			if (filters.shipping_order_id) {
				query = query.eq("shipping_order_id", filters.shipping_order_id);
			}
			if (filters.location_id) {
				query = query.eq("location_id", filters.location_id);
			}

			const { data, error } = await query;

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load pallets"));
		}
	},

	/**
	 * Update pallet
	 *
	 * @param id - Pallet ID
	 * @param updates - Partial pallet data
	 * @returns Updated pallet
	 * @throws Error with user-friendly message
	 */
	async update(id: string, updates: Partial<Pallet>): Promise<Pallet> {
		try {
			const { data, error } = await supabase.from("pallets").update(updates).eq("id", id).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Pallet not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to update pallet"));
		}
	},

	/**
	 * Delete pallet (soft delete via status)
	 *
	 * @param id - Pallet ID
	 * @throws Error with user-friendly message
	 */
	async delete(id: string): Promise<void> {
		try {
			const { error } = await supabase.from("pallets").delete().eq("id", id);

			if (error) {
				throw error;
			}
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to delete pallet"));
		}
	},
};

/**
 * Shipping Order Operations
 */
export const shippingOrders = {
	/**
	 * Create shipping order
	 *
	 * @param order - Shipping order data
	 * @returns Created shipping order
	 * @throws Error with user-friendly message
	 */
	async create(order: Omit<ShippingOrder, "id" | "created_at">): Promise<ShippingOrder> {
		try {
			const { data, error } = await supabase.from("shipping_orders").insert([order]).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Failed to create shipping order");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to create shipping order"));
		}
	},

	/**
	 * Get all shipping orders
	 *
	 * @returns Array of shipping orders
	 * @throws Error with user-friendly message
	 */
	async getAll(): Promise<(ShippingOrder & { lines?: ShippingOrderLine[] })[]> {
		try {
			const { data, error } = await supabase
				.from("shipping_orders")
				.select("*, shipping_order_lines(*)")
				.order("created_at", { ascending: false });

			if (error) {
				throw error;
			}

			// Map shipping_order_lines to lines for consistency
			const mappedData = (data || []).map((order: ShippingOrder) => ({
				...order,
				lines: order.lines || [],
			}));

			return mappedData;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load shipping orders"));
		}
	},

	/**
	 * Get shipping order by ID
	 *
	 * @param id - Shipping order ID
	 * @returns Shipping order with lines
	 * @throws Error with user-friendly message
	 */
	async getById(id: string): Promise<ShippingOrder & { lines: ShippingOrderLine[] }> {
		try {
			const { data, error } = await supabase
				.from("shipping_orders")
				.select("*, shipping_order_lines(*)")
				.eq("id", id)
				.single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Shipping order not found");
			}

			// Map shipping_order_lines to lines for consistency
			// Supabase returns it as shipping_order_lines, but we want it as lines
			return {
				...data,
				lines: (data as unknown as Record<string, unknown>).shipping_order_lines || data.lines || [],
			};
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load shipping order"));
		}
	},

	/**
	 * Update shipping order
	 *
	 * @param id - Shipping order ID
	 * @param updates - Partial shipping order data
	 * @returns Updated shipping order
	 * @throws Error with user-friendly message
	 */
	async update(id: string, updates: Partial<ShippingOrder>): Promise<ShippingOrder> {
		try {
			const { data, error } = await supabase.from("shipping_orders").update(updates).eq("id", id).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Shipping order not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to update shipping order"));
		}
	},

	/**
	 * Create shipping order lines
	 *
	 * @param lines - Array of shipping order lines
	 * @returns Created lines
	 * @throws Error with user-friendly message
	 */
	async createLines(lines: Omit<ShippingOrderLine, "id">[]): Promise<ShippingOrderLine[]> {
		try {
			const { data, error } = await supabase.from("shipping_order_lines").insert(lines).select();

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to create shipping order lines"));
		}
	},
};

/**
 * Get the earliest shipping order with remaining qty for an item (FIFO)
 *
 * FIFO Logic: Selects the shipping order with the earliest created_at timestamp
 * that has remaining quantity to fulfill for the given item.
 *
 * @param itemId - Product item ID to find orders for
 * @param shippingOrders - Array of shipping orders to filter
 * @returns ShippingOrder with earliest created_at and remaining qty > 0, or null if none found
 *
 * @example
 * const order = await getShipNowOrder('ITEM-123', shippingOrders);
 * if (order) {
 *   console.log(`Fulfilling order ${order.id} created at ${order.created_at}`);
 * }
 */
export async function getShipNowOrder(
	itemId: string,
	shippingOrders: (ShippingOrder & { lines?: ShippingOrderLine[] })[]
): Promise<ShippingOrder | null> {
	try {
		// Filter 1: Status must be Pending or Picking
		const validStatusOrders = shippingOrders.filter(
			(order) => order.status === "Pending" || order.status === "Picking"
		);

		// Filter 2: Order must have a line for this itemId
		const ordersWithItem = validStatusOrders.filter((order) => {
			if (!order.lines) return false;
			return order.lines.some((line) => line.item_id === itemId);
		});

		if (ordersWithItem.length === 0) {
			return null;
		}

		// Calculate RemainingQty for each order and filter to those with remaining qty > 0
		const ordersWithRemaining = ordersWithItem.filter((order) => {
			if (!order.lines) return false;

			// Find the line for this itemId
			const line = order.lines.find((l) => l.item_id === itemId);
			if (!line) return false;

			// Calculate remaining qty: requested_qty - SUM(assigned pallets)
			// For now, we assume remaining_qty is requested_qty (pallets not yet assigned)
			// This will be enhanced when pallet assignment logic is implemented
			const remainingQty = line.requested_qty;

			return remainingQty > 0;
		});

		if (ordersWithRemaining.length === 0) {
			return null;
		}

		// Sort by created_at (ascending) and return the first (earliest)
		const earliestOrder = ordersWithRemaining.sort((a, b) => {
			const dateA = new Date(a.created_at).getTime();
			const dateB = new Date(b.created_at).getTime();
			return dateA - dateB;
		})[0];

		return earliestOrder;
	} catch (error) {
		console.error("Error in getShipNowOrder:", error);
		return null;
	}
}

/**
 * Warehouse Operations
 */
export const warehouses = {
	/**
	 * Get default warehouse (Warehouse 1)
	 *
	 * @returns Warehouse object
	 * @throws Error with user-friendly message
	 */
	async getDefault(): Promise<Warehouse> {
		try {
			const { data, error } = await supabase.from("warehouses").select("*").eq("code", "W1").single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Default warehouse not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load warehouse"));
		}
	},
};

/**
 * Location Operations
 */
export const locations = {
	/**
	 * Get all locations
	 *
	 * @returns Array of locations
	 * @throws Error with user-friendly message
	 */
	async getAll(): Promise<Location[]> {
		try {
			const { data, error } = await supabase.from("locations").select("*").order("code", { ascending: true });

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load locations"));
		}
	},

	/**
	 * Resolve location by rack/level/position to database location record
	 *
	 * This function translates user-selected warehouse coordinates (rack, level, position)
	 * into a valid location database record. It handles both regular rack locations and
	 * the special aisle location.
	 *
	 * **Location Structure:**
	 * - Racks: 1-8
	 * - Levels: 1-4
	 * - Positions: A-T (20 positions per level)
	 * - Aisle: Special location code 'AISLE' (always valid)
	 *
	 * **Usage Examples:**
	 * ```typescript
	 * // Resolve regular rack location
	 * const location = await wmsApi.locations.resolve('warehouse-1', 5, 2, 'G');
	 * // Returns: { id: 'loc-123', code: 'W1-A-5-2', warehouse_id: 'warehouse-1', ... }
	 *
	 * // Resolve aisle location
	 * const aisleLocation = await wmsApi.locations.resolve('warehouse-1', 'AISLE', 1, 'A');
	 * // Returns: { id: 'loc-aisle', code: 'W1-AISLE', warehouse_id: 'warehouse-1', ... }
	 * ```
	 *
	 * @param warehouse_id - Warehouse UUID (e.g., from warehouses.getDefault())
	 * @param rack - Rack number (1-8) or 'AISLE' for aisle location
	 * @param level - Level number (1-4), ignored for aisle locations
	 * @param position - Position letter (A-T), ignored for aisle locations
	 * @returns Location object with id, code, warehouse_id, and other metadata
	 * @throws Error if location not found or database error occurs
	 *
	 * @example
	 * try {
	 *   const location = await wmsApi.locations.resolve(warehouseId, 3, 1, 'M');
	 *   console.log(`Resolved to location: ${location.code}`);
	 * } catch (error) {
	 *   console.error('Location not found:', error.message);
	 * }
	 */
	async resolve(warehouse_id: string, rack: number | string, level: number, position: string): Promise<Location> {
		try {
			let query = supabase.from("locations").select("*").eq("warehouse_id", warehouse_id);

			query =
				rack === "AISLE"
					? query.eq("code", `${warehouse_id}-AISLE`)
					: query.eq("rack", rack).eq("level", level).eq("position", position);

			const { data, error } = await query.single();

			if (error) {
				console.error("Location resolve error:", error);
				throw new Error("Location not found");
			}

			if (!data) {
				throw new Error("Location not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to resolve location"));
		}
	},
};

/**
 * Storage Operations
 */
export const storage = {
	/**
	 * Upload file to Supabase Storage
	 *
	 * @param bucket - Storage bucket name
	 * @param path - File path in bucket
	 * @param file - File to upload
	 * @returns Public URL of uploaded file
	 * @throws Error with user-friendly message
	 */
	async upload(bucket: string, path: string, file: File): Promise<string> {
		try {
			console.log(`Uploading to bucket: ${bucket}, path: ${path}, file size: ${file.size}`);

			// First try with upsert
			let uploadResult = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });

			// If RLS error, try without upsert
			if (uploadResult.error && uploadResult.error.message?.includes("row-level security")) {
				console.log("RLS error detected, retrying without upsert...");
				uploadResult = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600" });
			}

			const { data, error } = uploadResult;

			if (error) {
				console.error("Storage upload error:", error);
				throw error;
			}

			if (!data) {
				throw new Error("Upload failed - no data returned");
			}

			console.log("Upload successful:", data);

			// Get public URL
			const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

			console.log("Public URL:", urlData.publicUrl);
			return urlData.publicUrl;
		} catch (error) {
			console.error("Upload error details:", error);
			throw new Error(formatErrorMessage(error, "Failed to upload file"));
		}
	},

	/**
	 * Download file from Supabase Storage
	 *
	 * @param bucket - Storage bucket name
	 * @param path - File path in bucket
	 * @returns File blob
	 * @throws Error with user-friendly message
	 */
	async download(bucket: string, path: string): Promise<Blob> {
		try {
			const { data, error } = await supabase.storage.from(bucket).download(path);

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Download failed");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to download file"));
		}
	},

	/**
	 * Delete file from Supabase Storage
	 *
	 * @param bucket - Storage bucket name
	 * @param path - File path in bucket
	 * @throws Error with user-friendly message
	 */
	async delete(bucket: string, path: string): Promise<void> {
		try {
			const { error } = await supabase.storage.from(bucket).remove([path]);

			if (error) {
				throw error;
			}
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to delete file"));
		}
	},

	/**
	 * Get receiving order CSV from storage
	 *
	 * @param receivingOrderId - Receiving order ID
	 * @returns Public URL of the CSV file
	 * @throws Error with user-friendly message
	 */
	async getReceivingOrderCSV(receivingOrderId: string): Promise<string> {
		try {
			// List files in the receiving order directory
			const { data, error: listError } = await supabase.storage.from("uploads").list(`receiving/${receivingOrderId}`);

			if (listError) {
				throw listError;
			}

			if (!data || data.length === 0) {
				throw new Error("No CSV file found for this receiving order");
			}

			// Find the original CSV file
			const csvFile = data.find((file) => file.name.startsWith("original_"));

			if (!csvFile) {
				throw new Error("Original CSV file not found");
			}

			// Get public URL
			const { data: urlData } = supabase.storage
				.from("uploads")
				.getPublicUrl(`receiving/${receivingOrderId}/${csvFile.name}`);

			return urlData.publicUrl;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to retrieve receiving CSV"));
		}
	},
};

/**
 * Email Operations
 */
export const email = {
	/**
	 * Send email via Supabase
	 *
	 * @param to - Recipient email
	 * @param subject - Email subject
	 * @param body - Email body (plain text)
	 * @param _attachments - Optional file attachments
	 * @returns Success status
	 * @throws Error with user-friendly message
	 */
	async send(
		to: string,
		subject: string,
		body: string,
		_attachments?: { filename: string; content: string }[]
	): Promise<boolean> {
		try {
			// This will be implemented via Supabase Edge Functions
			// For now, just validate inputs
			if (!to || !subject || !body) {
				throw new Error("Email requires to, subject, and body");
			}

			// TODO: Call Supabase Edge Function to send email
			console.log("Email would be sent to:", to, "Subject:", subject);

			return true;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to send email"));
		}
	},
};

/**
 * Manifest Operations (Containers & Hand Deliveries)
 */
export const manifests = {
	/**
	 * Create manifest (container or hand delivery)
	 *
	 * @param manifest - Manifest data
	 * @returns Created manifest
	 * @throws Error with user-friendly message
	 */
	async create(manifest: Omit<Manifest, "id" | "created_at">): Promise<Manifest> {
		try {
			console.log("Creating manifest with data:", manifest);
			const { data, error } = await supabase
				.from("manifests")
				.insert([manifest])
				.select("id, type, container_num, seal_num, status, created_at, closed_at")
				.single();

			if (error) {
				console.error("Supabase error:", error);
				throw error;
			}

			if (!data) {
				throw new Error("Failed to create manifest");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to create manifest"));
		}
	},

	/**
	 * Get manifest by ID
	 *
	 * @param id - Manifest ID
	 * @returns Manifest data
	 * @throws Error with user-friendly message
	 */
	async getById(id: string): Promise<Manifest> {
		try {
			const { data, error } = await supabase.from("manifests").select("*").eq("id", id).single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Manifest not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load manifest"));
		}
	},

	/**
	 * Get manifests with filters
	 *
	 * @param filters - Filter criteria
	 * @returns Array of manifests
	 * @throws Error with user-friendly message
	 */
	async getFiltered(filters: { type?: string; status?: string }): Promise<Manifest[]> {
		try {
			let query = supabase.from("manifests").select("*");

			if (filters.type) {
				query = query.eq("type", filters.type);
			}
			if (filters.status) {
				query = query.eq("status", filters.status);
			}

			const { data, error } = await query;

			if (error) {
				throw error;
			}

			return data || [];
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to load manifests"));
		}
	},

	/**
	 * Update manifest
	 *
	 * @param id - Manifest ID
	 * @param updates - Partial manifest data
	 * @returns Updated manifest
	 * @throws Error with user-friendly message
	 */
	async update(id: string, updates: Partial<Manifest>): Promise<Manifest> {
		try {
			const { data, error } = await supabase.from("manifests").update(updates).eq("id", id).select().single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error("Manifest not found");
			}

			return data;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to update manifest"));
		}
	},
};

/**
 * Health Check Operations
 */
export const health = {
	/**
	 * Check Supabase connectivity
	 *
	 * @returns Success status
	 * @throws Error if connection fails
	 */
	async check(): Promise<boolean> {
		try {
			// Simple query to verify Supabase connectivity
			const { error } = await supabase.from("products").select("count", { count: "exact", head: true });

			if (error) {
				throw error;
			}

			return true;
		} catch (error) {
			throw new Error(formatErrorMessage(error, "Failed to connect to Supabase"));
		}
	},
};

export default {
	auth,
	products,
	receivingOrders,
	receivingOrderLines,
	pallets,
	shippingOrders,
	getShipNowOrder,
	manifests,
	warehouses,
	locations,
	storage,
	email,
	health,
};
