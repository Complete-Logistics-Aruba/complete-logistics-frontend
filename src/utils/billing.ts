/**
 * Billing Calculation Utilities
 *
 * Calculates pallet-position metrics for billing purposes.
 * All calculations are based on pallet positions, not pallet count.
 *
 * Story 8.3 Acceptance Criteria:
 * 1. Storage_Pallet_Positions: days_stored × pallet_positions for pallets in Stored status
 * 2. In_Pallet_Positions_Standard: SUM(pallet_positions) for received pallets, is_cross_dock=false
 * 3. CrossDock_Pallet_Positions: SUM(pallet_positions) for pallets created via SHIP-NOW
 * 4. Out_Pallet_Positions_Standard: SUM(pallet_positions) for shipped pallets, is_cross_dock=false, shipment_type != Hand_Delivery
 * 5. HandDelivery_Pallet_Positions: SUM(pallet_positions) for pallets shipped via hand delivery
 */

import type { Pallet, Product, ShippingOrder } from "../types/domain";

export interface BillingMetrics {
	storage_pallet_positions: number;
	in_pallet_positions_standard: number;
	cross_dock_pallet_positions: number;
	out_pallet_positions_standard: number;
	hand_delivery_pallet_positions: number;
}

/**
 * Calculate inclusive day count between two dates
 * Formula: (Date Shipped - Date Received) + 1
 */
export function calculateDayCount(startDate: Date, endDate: Date): number {
	const start = new Date(startDate);
	const end = new Date(endDate);
	start.setHours(0, 0, 0, 0);
	end.setHours(0, 0, 0, 0);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays + 1;
}

/**
 * Calculate storage pallet positions
 * For each pallet in Stored status during range: days_stored × pallet_positions
 */
export function calculateStoragePalletPositions(
	pallets: (Pallet & { product?: Product })[],
	fromDate: Date,
	toDate: Date
): number {
	let total = 0;

	for (const pallet of pallets) {
		// Only count pallets in Stored status
		if (pallet.status !== "Stored") continue;

		// Skip if no product info
		if (!pallet.product) continue;

		// Calculate days stored
		const palletDate = new Date(pallet.created_at);
		const from = new Date(fromDate);
		const to = new Date(toDate);

		// Skip if pallet created outside range
		if (palletDate < from || palletDate > to) continue;

		// Calculate days from creation to end of range
		const daysStored = calculateDayCount(palletDate, to);

		// Add to total: days × pallet_positions
		total += daysStored * (pallet.product.pallet_positions || 0);
	}

	return total;
}

/**
 * Calculate in pallet positions (standard)
 * SUM(pallet_positions) for pallets received in range, is_cross_dock=false
 */
export function calculateInPalletPositions(
	pallets: (Pallet & { product?: Product })[],
	fromDate: Date,
	toDate: Date
): number {
	let total = 0;

	for (const pallet of pallets) {
		// Only count non-cross-dock pallets
		if (pallet.is_cross_dock) continue;

		// Skip if no product info
		if (!pallet.product) continue;

		// Check if pallet created in range (received)
		const palletDate = new Date(pallet.created_at);
		const from = new Date(fromDate);
		const to = new Date(toDate);

		if (palletDate < from || palletDate > to) continue;

		// Add pallet_positions to total
		total += pallet.product.pallet_positions || 0;
	}

	return total;
}

/**
 * Calculate cross-dock pallet positions
 * SUM(pallet_positions) for pallets created via SHIP-NOW in range
 */
export function calculateCrossDockPalletPositions(
	pallets: (Pallet & { product?: Product })[],
	fromDate: Date,
	toDate: Date
): number {
	let total = 0;

	for (const pallet of pallets) {
		// Only count cross-dock pallets
		if (!pallet.is_cross_dock) continue;

		// Skip if no product info
		if (!pallet.product) continue;

		// Check if pallet created in range
		const palletDate = new Date(pallet.created_at);
		const from = new Date(fromDate);
		const to = new Date(toDate);

		if (palletDate < from || palletDate > to) continue;

		// Add pallet_positions to total
		total += pallet.product.pallet_positions || 0;
	}

	return total;
}

/**
 * Calculate out pallet positions (standard)
 * SUM(pallet_positions) for pallets shipped in range, is_cross_dock=false, shipment_type != Hand_Delivery
 */
export function calculateOutPalletPositions(
	pallets: (Pallet & { product?: Product; shippingOrder?: ShippingOrder })[],
	fromDate: Date,
	toDate: Date
): number {
	let total = 0;

	for (const pallet of pallets) {
		// Only count non-cross-dock pallets
		if (pallet.is_cross_dock) continue;

		// Only count shipped pallets
		if (pallet.status !== "Shipped") continue;

		// Skip if no product or shipping order info
		if (!pallet.product || !pallet.shippingOrder) continue;

		// Skip hand delivery shipments
		if (pallet.shippingOrder.shipment_type === "Hand_Delivery") continue;

		// Check if pallet shipped in range
		const shippedDate = new Date(pallet.shippingOrder.created_at);
		const from = new Date(fromDate);
		const to = new Date(toDate);

		if (shippedDate < from || shippedDate > to) continue;

		// Add pallet_positions to total
		total += pallet.product.pallet_positions || 0;
	}

	return total;
}

/**
 * Calculate hand delivery pallet positions
 * SUM(pallet_positions) for pallets shipped via hand delivery in range
 */
export function calculateHandDeliveryPalletPositions(
	pallets: (Pallet & { product?: Product; shippingOrder?: ShippingOrder })[],
	fromDate: Date,
	toDate: Date
): number {
	let total = 0;

	for (const pallet of pallets) {
		// Only count shipped pallets
		if (pallet.status !== "Shipped") continue;

		// Skip if no product or shipping order info
		if (!pallet.product || !pallet.shippingOrder) continue;

		// Only count hand delivery shipments
		if (pallet.shippingOrder.shipment_type !== "Hand_Delivery") continue;

		// Check if pallet shipped in range
		const shippedDate = new Date(pallet.shippingOrder.created_at);
		const from = new Date(fromDate);
		const to = new Date(toDate);

		if (shippedDate < from || shippedDate > to) continue;

		// Add pallet_positions to total
		total += pallet.product.pallet_positions || 0;
	}

	return total;
}

/**
 * Calculate all billing metrics for a date range
 */
export function calculateAllBillingMetrics(
	pallets: (Pallet & { product?: Product; shippingOrder?: ShippingOrder })[],
	fromDate: string,
	toDate: string
): BillingMetrics {
	const from = new Date(fromDate);
	const to = new Date(toDate);

	return {
		storage_pallet_positions: calculateStoragePalletPositions(pallets, from, to),
		in_pallet_positions_standard: calculateInPalletPositions(pallets, from, to),
		cross_dock_pallet_positions: calculateCrossDockPalletPositions(pallets, from, to),
		out_pallet_positions_standard: calculateOutPalletPositions(pallets, from, to),
		hand_delivery_pallet_positions: calculateHandDeliveryPalletPositions(pallets, from, to),
	};
}
