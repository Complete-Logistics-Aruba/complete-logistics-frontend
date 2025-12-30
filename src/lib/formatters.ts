/**
 * Formatting utilities for consistent data display and input
 *
 * @module lib/formatters
 */

/**
 * Format container number to standard format
 * Converts various inputs to standard CONT-XXXXXXX format (4 letters, 7 numbers)
 *
 * @param input - Raw container number input
 * @returns Formatted container number
 */
export function formatContainerNumber(input: string): string {
	if (!input || typeof input !== "string") {
		return "";
	}

	// Remove whitespace and convert to uppercase
	const cleaned = input.trim().toUpperCase();

	// If already in correct format, return as-is
	if (/^[A-Z]{4}-\d{7}$/.test(cleaned)) {
		return cleaned;
	}

	// If just numbers, add CONT- prefix
	if (/^\d{7}$/.test(cleaned)) {
		return `CONT-${cleaned}`;
	}

	// If starts with CONT but no dash, add dash
	if (/^CONT\d{7}$/.test(cleaned)) {
		return `CONT-${cleaned.slice(4)}`;
	}

	// If has other format, try to extract numbers
	const numbers = cleaned.match(/\d{7}/);
	if (numbers) {
		const prefix = cleaned.replaceAll(/\d{7}/, "").replaceAll(/[^A-Z-]/g, "") || "CONT";
		return `${prefix}-${numbers[0]}`;
	}

	// Fallback: return cleaned version
	return cleaned;
}

/**
 * Validate container number format
 *
 * @param containerNumber - Container number to validate
 * @returns True if valid format
 */
export function isValidContainerNumber(containerNumber: string): boolean {
	if (!containerNumber || typeof containerNumber !== "string") {
		return false;
	}

	// Accept standard format: CONT-1234567
	// Also accept variations: CONT1234567, 1234567, etc.
	const cleaned = containerNumber.trim().toUpperCase();

	return /^[A-Z]{4}-?\d{7}$/.test(cleaned) || /^\d{7}$/.test(cleaned);
}

/**
 * Generate container number placeholder text
 *
 * @returns Placeholder text showing expected format
 */
export function getContainerNumberPlaceholder(): string {
	return "e.g., CONT-1234567";
}
