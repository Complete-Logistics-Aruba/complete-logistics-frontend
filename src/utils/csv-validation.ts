/**
 * CSV Validation Utilities
 *
 * Provides CSV parsing and validation functions for product master and order uploads.
 *
 * @module utils/csv-validation
 */

export interface CSVParseResult<T> {
	valid: boolean;
	data: T[];
	errors: CSVError[];
}

export interface CSVError {
	row: number;
	field: string;
	message: string;
}

/**
 * Parse CSV file content with proper quoted field handling
 *
 * Handles:
 * - Quoted fields with commas inside (e.g., "Brush, Nylon")
 * - Escaped quotes inside quoted fields (e.g., "Quote: ""Hello""")
 * - Empty fields
 *
 * @param content - CSV file content as string
 * @returns Array of parsed rows
 */
export function parseCSV(content: string): Record<string, string>[] {
	const lines = content.trim().split("\n");
	if (lines.length < 2) {
		throw new Error("CSV must contain header and at least one data row");
	}

	// Parse header row
	const headers = parseCSVLine(lines[0]);

	// Parse data rows
	const rows: Record<string, string>[] = [];
	let currentLineIndex = 1;

	while (currentLineIndex < lines.length) {
		const line = lines[currentLineIndex];
		if (line.trim() === "") {
			currentLineIndex++;
			continue; // Skip empty lines
		}

		// Handle multi-line quoted fields
		let fullLine = line;
		while (fullLine.endsWith('"') === false && fullLine.includes('"') && currentLineIndex + 1 < lines.length) {
			// Check if we're in the middle of a quoted field
			const quoteCount = (fullLine.match(/"/g) || []).length;
			if (quoteCount % 2 === 1) {
				// Odd number of quotes means we're in a quoted field
				currentLineIndex++;
				fullLine += "\n" + lines[currentLineIndex];
			} else {
				break;
			}
		}

		const values = parseCSVLine(fullLine);
		const row: Record<string, string> = {};

		for (const [index, header] of headers.entries()) {
			row[header] = values[index] || "";
		}

		rows.push(row);
		currentLineIndex++;
	}

	return rows;
}

/**
 * Parse a single CSV line respecting quoted fields
 *
 * @param line - CSV line to parse
 * @returns Array of field values
 */
function parseCSVLine(line: string): string[] {
	const fields: string[] = [];
	let currentField = "";
	let insideQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (char === '"') {
			if (insideQuotes && nextChar === '"') {
				// Escaped quote
				currentField += '"';
				i++; // Skip next quote
			} else {
				// Toggle quote state
				insideQuotes = !insideQuotes;
			}
		} else if (char === "," && !insideQuotes) {
			// Field separator
			fields.push(currentField.trim());
			currentField = "";
		} else {
			currentField += char;
		}
	}

	// Add last field
	fields.push(currentField.trim());

	return fields;
}

/**
 * Read file as text
 *
 * @param file - File to read
 * @returns Promise resolving to file content
 */
export async function readFileAsText(file: File): Promise<string> {
	try {
		return await file.text();
	} catch {
		throw new Error("Failed to read file");
	}
}

/**
 * Validate product master CSV
 *
 * @param file - CSV file
 * @returns Parse result with validation
 */
export async function validateProductMasterCSV(file: File): Promise<CSVParseResult<Record<string, string>>> {
	// Validate file type
	if (!file.name.endsWith(".csv")) {
		throw new Error("File must be a CSV file");
	}

	// Validate file size (max 5MB)
	const maxSize = 5 * 1024 * 1024;
	if (file.size > maxSize) {
		throw new Error("File size exceeds 5MB limit");
	}

	// Read file
	const content = await readFileAsText(file);

	// Parse CSV
	const rows = parseCSV(content);

	// Validate rows
	const errors: CSVError[] = [];
	const validRows: Record<string, string>[] = [];

	for (const [index, row] of rows.entries()) {
		const rowNumber = index + 2; // +2 because row 1 is header, index starts at 0
		const rowErrors: CSVError[] = [];

		// Validate item_id
		if (!row.item_id || row.item_id.trim() === "") {
			rowErrors.push({
				row: rowNumber,
				field: "item_id",
				message: "item_id is required",
			});
		}

		// Validate units_per_pallet
		if (!row.units_per_pallet || row.units_per_pallet.trim() === "") {
			rowErrors.push({
				row: rowNumber,
				field: "units_per_pallet",
				message: "units_per_pallet is required",
			});
		} else {
			const unitsPerPallet = Number.parseInt(row.units_per_pallet, 10);
			if (Number.isNaN(unitsPerPallet) || unitsPerPallet <= 0) {
				rowErrors.push({
					row: rowNumber,
					field: "units_per_pallet",
					message: "units_per_pallet must be a positive number",
				});
			}
		}

		// Validate pallet_positions (optional, defaults to 1)
		if (row.pallet_positions && row.pallet_positions.trim() !== "") {
			const palletPositions = Number.parseInt(row.pallet_positions, 10);
			if (Number.isNaN(palletPositions) || palletPositions < 1) {
				rowErrors.push({
					row: rowNumber,
					field: "pallet_positions",
					message: "pallet_positions must be >= 1",
				});
			}
		}

		if (rowErrors.length > 0) {
			errors.push(...rowErrors);
		} else {
			validRows.push(row);
		}
	}

	return {
		valid: errors.length === 0,
		data: validRows,
		errors,
	};
}

/**
 * Validate receiving order CSV
 *
 * Validates that:
 * - item_id exists in products and is active
 * - qty is required and > 0
 * - qty is a multiple of units_per_pallet
 *
 * @param file - CSV file
 * @param products - Array of products for validation (with active status)
 * @returns Parse result with validation
 */
export async function validateReceivingOrderCSV(
	file: File,
	products: Array<{ item_id: string; units_per_pallet: number; active: boolean }>
): Promise<CSVParseResult<Record<string, string>>> {
	// Validate file type
	if (!file.name.endsWith(".csv")) {
		throw new Error("File must be a CSV file");
	}

	// Validate file size (max 5MB)
	const maxSize = 5 * 1024 * 1024;
	if (file.size > maxSize) {
		throw new Error("File size exceeds 5MB limit");
	}

	// Read file
	const content = await readFileAsText(file);

	// Parse CSV
	const rows = parseCSV(content);

	// Validate rows
	const errors: CSVError[] = [];
	const validRows: Record<string, string>[] = [];

	for (const [index, row] of rows.entries()) {
		const rowNumber = index + 2;
		const rowErrors: CSVError[] = [];

		// Validate item_id
		if (!row.item_id || row.item_id.trim() === "") {
			rowErrors.push({
				row: rowNumber,
				field: "item_id",
				message: "item_id is required",
			});
		} else {
			// Check if item_id exists in products
			const product = products.find((p) => p.item_id === row.item_id);
			if (!product) {
				rowErrors.push({
					row: rowNumber,
					field: "item_id",
					message: `item_id "${row.item_id}" not found in product master`,
				});
			} else if (!product.active) {
				// Check if product is active
				rowErrors.push({
					row: rowNumber,
					field: "item_id",
					message: `item_id "${row.item_id}" is inactive`,
				});
			}
		}

		// Validate qty
		if (!row.qty || row.qty.trim() === "") {
			rowErrors.push({
				row: rowNumber,
				field: "qty",
				message: "qty is required",
			});
		} else {
			const qty = Number.parseInt(row.qty, 10);
			if (Number.isNaN(qty)) {
				rowErrors.push({
					row: rowNumber,
					field: "qty",
					message: "qty must be an integer",
				});
			} else if (qty <= 0) {
				rowErrors.push({
					row: rowNumber,
					field: "qty",
					message: "qty must be > 0",
				});
			} else {
				// Check if qty is multiple of units_per_pallet
				const product = products.find((p) => p.item_id === row.item_id);
				if (product && qty % product.units_per_pallet !== 0) {
					rowErrors.push({
						row: rowNumber,
						field: "qty",
						message: `qty must be a multiple of ${product.units_per_pallet}`,
					});
				}
			}
		}

		if (rowErrors.length > 0) {
			errors.push(...rowErrors);
		} else {
			validRows.push(row);
		}
	}

	return {
		valid: errors.length === 0,
		data: validRows,
		errors,
	};
}

/**
 * Validate shipping order CSV
 *
 * Validates that:
 * - item_id exists in products
 * - qty_ordered is required and > 0
 *
 * @param file - CSV file
 * @param products - Array of products for validation
 * @returns Parse result with validation
 */
export async function validateShippingOrderCSV(
	file: File,
	products: Array<{ item_id: string }>
): Promise<CSVParseResult<Record<string, string>>> {
	// Validate file type
	if (!file.name.endsWith(".csv")) {
		throw new Error("File must be a CSV file");
	}

	// Validate file size (max 5MB)
	const maxSize = 5 * 1024 * 1024;
	if (file.size > maxSize) {
		throw new Error("File size exceeds 5MB limit");
	}

	// Read file
	const content = await readFileAsText(file);

	// Parse CSV
	const rows = parseCSV(content);

	// Validate rows
	const errors: CSVError[] = [];
	const validRows: Record<string, string>[] = [];

	for (const [index, row] of rows.entries()) {
		const rowNumber = index + 2;
		const rowErrors: CSVError[] = [];

		// Validate item_id
		if (!row.item_id || row.item_id.trim() === "") {
			rowErrors.push({
				row: rowNumber,
				field: "item_id",
				message: "item_id is required",
			});
		} else {
			// Check if item_id exists in products
			const product = products.find((p) => p.item_id === row.item_id);
			if (!product) {
				rowErrors.push({
					row: rowNumber,
					field: "item_id",
					message: `item_id "${row.item_id}" not found in product master`,
				});
			}
		}

		// Validate qty_ordered
		if (!row.qty_ordered || row.qty_ordered.trim() === "") {
			rowErrors.push({
				row: rowNumber,
				field: "qty_ordered",
				message: "qty_ordered is required",
			});
		} else {
			const qtyOrdered = Number.parseInt(row.qty_ordered, 10);
			if (Number.isNaN(qtyOrdered) || qtyOrdered <= 0) {
				rowErrors.push({
					row: rowNumber,
					field: "qty_ordered",
					message: "qty_ordered must be a positive number",
				});
			}
		}

		if (rowErrors.length > 0) {
			errors.push(...rowErrors);
		} else {
			validRows.push(row);
		}
	}

	return {
		valid: errors.length === 0,
		data: validRows,
		errors,
	};
}
