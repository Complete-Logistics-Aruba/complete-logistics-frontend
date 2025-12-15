/**
 * CSV Export Utilities
 *
 * Generates and exports CSV files for billing and other reports.
 */

import type { BillingMetrics } from "./billing";

export interface HandDeliveryRow {
	deliveryDate: string;
	orderRef: string;
	totalPalletPositions: number;
	notes: string;
}

/**
 * Escape CSV field values
 * Wraps fields containing commas, quotes, or newlines in quotes
 * Escapes internal quotes by doubling them
 */
export function escapeCSVField(field: string | number): string {
	const str = String(field);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replaceAll('"', '""')}"`;
	}
	return str;
}

/**
 * Generate billing CSV content
 * Includes summary row with all metrics and detail rows for hand deliveries
 */
export function generateBillingCSV(metrics: BillingMetrics, handDeliveryRows: HandDeliveryRow[]): string {
	const lines: string[] = [];

	// Summary row header
	lines.push(
		"Storage_Pallet_Positions,In_Pallet_Positions_Standard,CrossDock_Pallet_Positions,Out_Pallet_Positions_Standard,HandDelivery_Pallet_Positions",
		[
			metrics.storage_pallet_positions,
			metrics.in_pallet_positions_standard,
			metrics.cross_dock_pallet_positions,
			metrics.out_pallet_positions_standard,
			metrics.hand_delivery_pallet_positions,
		]
			.map((field) => escapeCSVField(field))
			.join(","),
		"",
		"Delivery Date,Shipping Order Ref,Total_Pallet_Positions,Notes"
	);

	// Detail rows data
	for (const row of handDeliveryRows) {
		lines.push(
			[row.deliveryDate, row.orderRef, row.totalPalletPositions, row.notes]
				.map((field) => escapeCSVField(field))
				.join(",")
		);
	}

	return lines.join("\n");
}

/**
 * Generate filename for billing CSV
 * Format: billing_YYYY-MM-DD_YYYY-MM-DD.csv
 */
export function generateBillingFilename(fromDate: string, toDate: string): string {
	return `billing_${fromDate}_${toDate}.csv`;
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(content: string, filename: string): void {
	// Create blob from CSV content
	const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });

	// Create temporary URL for blob
	const url = URL.createObjectURL(blob);

	// Create temporary link element
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", filename);
	link.style.visibility = "hidden";

	// Append to body, click, and remove
	document.body.append(link);
	link.click();
	link.remove();

	// Clean up URL
	URL.revokeObjectURL(url);
}

/**
 * Export billing data to CSV and trigger download
 */
export function exportBillingToCSV(
	metrics: BillingMetrics,
	handDeliveryRows: HandDeliveryRow[],
	fromDate: string,
	toDate: string
): void {
	// Generate CSV content
	const csvContent = generateBillingCSV(metrics, handDeliveryRows);

	// Generate filename
	const filename = generateBillingFilename(fromDate, toDate);

	// Trigger download
	downloadCSV(csvContent, filename);
}
