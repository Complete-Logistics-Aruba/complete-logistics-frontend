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
 * For each pallet physically in warehouse (Received, Stored, or Staged) during range: days_stored × pallet_positions
 * Counts any pallet that was in warehouse at any point during the date range
 */
export function calculateStoragePalletPositions(
	pallets: (Pallet & { product?: Product })[],
	fromDate: Date,
	toDate: Date
): number {
	let total = 0;
	const from = new Date(fromDate);
	const to = new Date(toDate);

	// Check if it's a single day range
	const isSingleDay = from.toDateString() === to.toDateString();

	for (const pallet of pallets) {
		// Only count pallets physically in warehouse (Received, Stored, or Staged)
		if (!["Received", "Stored", "Staged"].includes(pallet.status)) continue;

		// Skip if no product info
		if (!pallet.product) continue;

		// For storage, use received_at or created_at as start date
		const startDate = pallet.received_at ? new Date(pallet.received_at) : new Date(pallet.created_at);

		// If pallet was received after range end, skip it
		if (startDate > to) continue;

		if (isSingleDay) {
			// For single day: count all pallets present on that day
			// Pallet is present if it was received on or before the range date
			if (startDate <= to) {
				total += pallet.product.pallet_positions || 0;
			}
		} else {
			// For multi-day: calculate days stored within range
			// Start from max(pallet received date, range start)
			const storageStart = new Date(Math.max(startDate.getTime(), from.getTime()));
			const daysStored = calculateDayCount(storageStart, to);

			// Add to total: days × pallet_positions
			total += daysStored * (pallet.product.pallet_positions || 0);
		}
	}

	return total;
}

/**
 * Calculate in pallet positions (standard)
 * SUM(pallet_positions) for pallets received, is_cross_dock=false
 * Counts pallets that are NOT Shipped (i.e., still in warehouse: Received, Stored, Staged, Loaded)
 * Filters by receiving_order.finalized_at (or created_at as proxy) within date range
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

		// Count pallets that are NOT shipped (still in warehouse: Received, Stored, Staged, Loaded)
		if (pallet.status === "Shipped") continue;

		// Filter by creation date (proxy for receiving_order.finalized_at)
		const palletDate = new Date(pallet.created_at);
		if (palletDate < fromDate || palletDate > toDate) continue;

		// Add pallet_positions to total
		total += pallet.product.pallet_positions || 0;
	}

	return total;
}

/**
 * Calculate cross-dock pallet positions
 * SUM(pallet_positions) for cross-dock pallets (created via SHIP-NOW)
 * Filters by receiving_order.finalized_at (or created_at as proxy) within date range
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

		// Filter by creation date (proxy for receiving_order.finalized_at)
		const palletDate = new Date(pallet.created_at);
		if (palletDate < fromDate || palletDate > toDate) continue;

		// Add pallet_positions to total
		total += pallet.product.pallet_positions || 0;
	}

	return total;
}

/**
 * Calculate out pallet positions (standard)
 * SUM(pallet_positions) for pallets shipped in range, is_cross_dock=false, shipment_type != Hand_Delivery
 * Filters by shipping date within range
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

		// Skip if no product info
		if (!pallet.product) continue;

		// Skip hand delivery shipments
		if (pallet.shippingOrder && pallet.shippingOrder.shipment_type === "Hand_Delivery") continue;

		// Filter by shipping date (use shippingOrder.created_at as proxy for manifest.closed_at)
		if (pallet.shippingOrder) {
			const shippedDate = new Date(pallet.shippingOrder.created_at);
			if (shippedDate < fromDate || shippedDate > toDate) continue;
		}

		// Add pallet_positions to total
		total += pallet.product.pallet_positions || 0;
	}

	return total;
}

/**
 * Calculate hand delivery pallet positions
 * SUM(pallet_positions) for pallets shipped via hand delivery in range
 * Note: Currently uses shippingOrder.created_at as proxy for manifest.closed_at
 * In production, should join with manifests table and filter by manifest.closed_at where manifest.type='Hand'
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

		// Filter by shipping date (proxy for manifest.closed_at)
		// In production, this should check manifest.closed_at where manifest.type='Hand'
		const shippedDate = new Date(pallet.shippingOrder.created_at);
		if (shippedDate < fromDate || shippedDate > toDate) continue;

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
	from.setHours(0, 0, 0, 0); // Start of day

	const to = new Date(toDate);
	to.setHours(23, 59, 59, 999); // End of day

	return {
		storage_pallet_positions: calculateStoragePalletPositions(pallets, from, to),
		in_pallet_positions_standard: calculateInPalletPositions(pallets, from, to),
		cross_dock_pallet_positions: calculateCrossDockPalletPositions(pallets, from, to),
		out_pallet_positions_standard: calculateOutPalletPositions(pallets, from, to),
		hand_delivery_pallet_positions: calculateHandDeliveryPalletPositions(pallets, from, to),
	};
}
