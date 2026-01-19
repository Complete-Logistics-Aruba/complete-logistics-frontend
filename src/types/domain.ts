/**
 * Domain Types
 *
 * Core business domain types for the 3PL WMS system.
 * These types represent the main entities in the system.
 *
 * @module types/domain
 */

/**
 * User with role information
 */
export interface User {
	id: string;
	email: string;
	role: "Customer Service" | "Warehouse" | "Admin";
}

/**
 * Product in the catalog
 */
export interface Product {
	id: string;
	item_id: string;
	description: string;
	units_per_pallet: number;
	pallet_positions: number;
	active: boolean;
	created_at: string;
}

/**
 * Receiving order header
 */
export interface ReceivingOrder {
	id: string;
	container_num: string;
	seal_num: string;
	status: "Pending" | "Unloading" | "Staged" | "Received";
	container_photos?: string[];
	expected_items_count?: number;
	created_at: string;
	created_by: string;
	lines?: ReceivingOrderLine[];
}

/**
 * Receiving order line item
 */
export interface ReceivingOrderLine {
	id: string;
	receiving_order_id: string;
	item_id: string;
	expected_qty: number;
	created_at: string;
}

/**
 * Pallet (physical unit of inventory)
 */
export interface Pallet {
	id: string;
	item_id: string;
	qty: number;
	status: "Received" | "Stored" | "Staged" | "Loaded" | "Shipped" | "WriteOff";
	location_id?: string;
	shipping_order_id?: string;
	receiving_order_id?: string;
	is_cross_dock: boolean;
	manifest_id?: string;
	received_at?: string;
	shipped_at?: string;
	created_at: string;
}

/**
 * Shipping order header
 */
export interface ShippingOrder {
	id: string;
	order_ref: string;
	shipment_type: "Hand_Delivery" | "Container_Loading";
	seal_num?: string;
	status: "Pending" | "Picking" | "Loading" | "Completed" | "Shipped" | "Cancelled";
	created_at: string;
	shipped_at?: string;
	cancelled_at?: string;
	lines?: ShippingOrderLine[];
}

/**
 * Shipping order line item
 */
export interface ShippingOrderLine {
	id: string;
	shipping_order_id: string;
	item_id: string;
	requested_qty: number;
	created_at?: string;
}

/**
 * Warehouse location
 */
export interface Location {
	location_id: string;
	warehouse_id: string;
	type: "RACK" | "AISLE";
	rack?: number;
	level?: number;
	position?: string;
	is_active?: boolean;
	is_blocked?: boolean;
	created_at?: string;
}

/**
 * Warehouse
 */
export interface Warehouse {
	id: string;
	code: string;
	name: string;
	created_at: string;
}

/**
 * Manifest for container loading
 */
export interface Manifest {
	id: string;
	type: "Container" | "Hand_Delivery";
	container_num?: string;
	seal_num: string;
	status: "Open" | "Closed" | "Cancelled";
	created_at: string;
	closed_at?: string;
}

/**
 * Email log entry
 */
export interface EmailLog {
	id: string;
	recipient: string;
	subject: string;
	status: "Sent" | "Failed" | "Pending";
	error_message?: string;
	created_at: string;
}

/**
 * Billing metric
 */
export interface BillingMetrics {
	storage_pallet_positions: number;
	in_pallet_positions_standard: number;
	cross_dock_pallet_positions: number;
	out_pallet_positions_standard: number;
	hand_delivery_pallet_positions: number;
}
