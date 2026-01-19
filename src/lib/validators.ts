/**
 * Validation Schemas
 *
 * Zod schemas for form validation across the application.
 * All forms use these schemas for type-safe validation.
 *
 * @module lib/validators
 */

import { z } from "zod";

/**
 * Login form schema
 */
export const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Product schema
 */
export const productSchema = z.object({
	item_id: z.string().min(1, "Item ID is required"),
	description: z.string().min(1, "Description is required"),
	units_per_pallet: z.number().int().positive("Units per pallet must be > 0"),
	pallet_positions: z.number().int().positive("Pallet positions must be > 0"),
	active: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;

/**
 * Receiving order schema
 */
export const receivingOrderSchema = z.object({
	container_num: z
		.string()
		.min(1, "Container number is required")
		.regex(/^[A-Z]{4}-?\d{7}$/i, "Container number must be 4 letters, 7 numbers (e.g., CONT-1234567)"),
	seal_num: z.string().min(1, "Seal number is required"),
});

export type ReceivingOrderFormData = z.infer<typeof receivingOrderSchema>;

/**
 * Container registration schema (supports both Container and Hand Delivery manifests)
 */
export const containerSchema = z
	.object({
		manifest_type: z.enum(["Container", "Hand_Delivery"], {
			errorMap: () => ({ message: "Please select a manifest type" }),
		}),
		container_num: z.string().optional(),
		seal_num: z.string().min(1, "Seal number is required").min(3, "Seal number must be at least 3 characters"),
	})
	.refine(
		(data) => {
			if (data.manifest_type === "Container") {
				return data.container_num && data.container_num.length >= 3 && /^[A-Z]{4}-?\d{7}$/i.test(data.container_num);
			}
			return true; // Hand Delivery doesn't need container number
		},
		{
			message: "Container number must be 4 letters, 7 numbers (e.g., CONT-1234567)",
			path: ["container_num"],
		}
	);

export type ContainerFormData = z.infer<typeof containerSchema>;

/**
 * Receiving order line schema
 */
export const receivingOrderLineSchema = z.object({
	product_id: z.string().min(1, "Product is required"),
	qty_expected: z.number().int().positive("Quantity must be > 0"),
});

export type ReceivingOrderLineFormData = z.infer<typeof receivingOrderLineSchema>;

/**
 * Shipping order schema
 */
export const shippingOrderSchema = z.object({
	order_ref: z.string().min(1, "Order reference is required"),
	shipment_type: z.enum(["Hand_Delivery", "Container_Loading"]),
});

export type ShippingOrderFormData = z.infer<typeof shippingOrderSchema>;

/**
 * Shipping order line schema
 */
export const shippingOrderLineSchema = z.object({
	product_id: z.string().min(1, "Product is required"),
	qty_ordered: z.number().int().positive("Quantity must be > 0"),
});

export type ShippingOrderLineFormData = z.infer<typeof shippingOrderLineSchema>;

/**
 * Location selection schema
 */
export const locationSelectionSchema = z.object({
	rack: z.union([z.number().int().min(1).max(8), z.literal("AISLE")]),
	level: z.number().int().min(1).max(4).optional(),
	position: z.string().min(1).max(1).optional(),
});

export type LocationSelectionFormData = z.infer<typeof locationSelectionSchema>;

/**
 * Pallet quantity schema (for put-away adjustments)
 */
export const palletQtySchema = z.object({
	qty: z.number().int().positive("Quantity must be > 0"),
});

export type PalletQtyFormData = z.infer<typeof palletQtySchema>;

/**
 * Email schema (for sending emails)
 */
export const emailSchema = z.object({
	to: z.string().email("Invalid recipient email"),
	subject: z.string().min(1, "Subject is required"),
	body: z.string().min(1, "Body is required"),
});

export type EmailFormData = z.infer<typeof emailSchema>;

/**
 * Date range schema (for billing reports)
 */
export const dateRangeSchema = z
	.object({
		fromDate: z.date(),
		toDate: z.date(),
	})
	.refine((data) => data.fromDate <= data.toDate, {
		message: "From date must be before or equal to to date",
		path: ["toDate"],
	});

export type DateRangeFormData = z.infer<typeof dateRangeSchema>;

/**
 * Inventory adjustment schema
 */
export const inventoryAdjustmentSchema = z.object({
	pallet_id: z.string().min(1, "Pallet is required"),
	reason: z.enum(["Damaged", "Lost", "Count Correction"]),
	notes: z.string().optional(),
});

export type InventoryAdjustmentFormData = z.infer<typeof inventoryAdjustmentSchema>;
