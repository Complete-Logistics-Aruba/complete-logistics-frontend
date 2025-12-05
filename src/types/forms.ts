/**
 * Form Data Types
 *
 * Types for form data across the application.
 * Used with React Hook Form and Zod validation.
 *
 * @module types/forms
 */

/**
 * Authentication forms
 */
export interface LoginFormData {
	email: string;
	password: string;
}

/**
 * Product forms
 */
export interface ProductFormData {
	item_id: string;
	description: string;
	units_per_pallet: number;
	pallet_positions: number;
	active: boolean;
}

/**
 * Receiving order forms
 */
export interface ReceivingOrderFormData {
	container_num: string;
	seal_num: string;
}

export interface ReceivingOrderLineFormData {
	product_id: string;
	qty_expected: number;
}

/**
 * Pallet forms
 */
export interface PalletFormData {
	qty: number;
	location?: string;
}

export interface PalletQtyAdjustmentFormData {
	qty: number;
	reason?: string;
}

export interface PalletWriteOffFormData {
	reason: "Damaged" | "Lost" | "Count Correction";
	notes?: string;
}

/**
 * Shipping order forms
 */
export interface ShippingOrderFormData {
	order_ref: string;
	shipment_type: "Hand_Delivery" | "Container_Loading";
	seal_num?: string;
}

export interface ShippingOrderLineFormData {
	product_id: string;
	qty_ordered: number;
}

/**
 * Location forms
 */
export interface LocationSelectionFormData {
	rack: number | "AISLE";
	level?: number;
	position?: string;
}

/**
 * File upload forms
 */
export interface FileUploadFormData {
	file: File;
}

export interface PhotoUploadFormData {
	photos: File[];
}

/**
 * Email forms
 */
export interface EmailFormData {
	to: string;
	subject: string;
	body: string;
}

/**
 * Billing forms
 */
export interface BillingReportFormData {
	fromDate: Date;
	toDate: Date;
}

/**
 * Search/Filter forms
 */
export interface ProductSearchFormData {
	query?: string;
	active?: boolean;
}

export interface PalletFilterFormData {
	status?: string;
	location?: string;
	product?: string;
}

export interface ReceivingOrderFilterFormData {
	status?: string;
	container_num?: string;
	dateFrom?: Date;
	dateTo?: Date;
}

export interface ShippingOrderFilterFormData {
	status?: string;
	order_ref?: string;
	shipment_type?: "Hand_Delivery" | "Container_Loading";
	dateFrom?: Date;
	dateTo?: Date;
}

/**
 * Pagination forms
 */
export interface PaginationFormData {
	page: number;
	limit: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

/**
 * Bulk operation forms
 */
export interface BulkPalletUpdateFormData {
	palletIds: string[];
	status?: string;
	location?: string;
}

export interface BulkPalletWriteOffFormData {
	palletIds: string[];
	reason: "Damaged" | "Lost" | "Count Correction";
	notes?: string;
}

/**
 * CSV import forms
 */
export interface CSVImportFormData {
	file: File;
	type: "products" | "receiving" | "shipping";
}

/**
 * Settings forms
 */
export interface UserSettingsFormData {
	email: string;
	name?: string;
	preferences?: {
		notifications?: boolean;
		darkMode?: boolean;
	};
}
