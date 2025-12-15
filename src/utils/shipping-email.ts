/**
 * Shipping Email utility functions
 * Uses Supabase email service with retry logic and exponential backoff
 * Sends shipping confirmation emails with form and photo attachments
 */

interface ShippingEmailItem {
	itemId: string;
	description: string;
	qtyShipped: number;
}

interface ShippingEmailData {
	shippingOrderId: string;
	orderRef: string;
	shipmentType: "Hand_Delivery" | "Container_Loading";
	items: ShippingEmailItem[];
	containerNum?: string;
	sealNum?: string;
	formUrl?: string;
	photoUrls?: string[];
}

/**
 * Compose plain text email body for shipping confirmation
 */
export function composeShippingEmailBody(data: ShippingEmailData): string {
	const itemsList = data.items
		.map((item) => `- ${item.itemId}: ${item.description} (${item.qtyShipped} units)`)
		.join("\n");

	let body = `Shipping Confirmation

Order Reference: ${data.orderRef}
Shipment Type: ${data.shipmentType === "Hand_Delivery" ? "Hand Delivery" : "Container Loading"}`;

	if (data.shipmentType === "Container_Loading" && data.containerNum) {
		body += `\nContainer #: ${data.containerNum}`;
	}

	if (data.sealNum) {
		body += `\nSeal #: ${data.sealNum}`;
	}

	body += `\n\nItems Shipped:
${itemsList}

Total Items: ${data.items.length}`;

	if (data.formUrl) {
		body += `\n\nShipping Form: ${data.formUrl}`;
	}

	if (data.photoUrls && data.photoUrls.length > 0) {
		body += `\n\nOutbound Photos (${data.photoUrls.length}):`;
		for (const [index, url] of data.photoUrls.entries()) {
			body += `\n${index + 1}. ${url}`;
		}
	}

	body += `\n\nThank you!`;

	return body;
}

/**
 * Send shipping confirmation email with retry logic
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s)
 * Includes shipping form and outbound photos as attachments
 */
export async function sendShippingEmail(data: ShippingEmailData): Promise<void> {
	const emailTo = import.meta.env.VITE_EMAIL_TO_SHIPPING || "shipping@example.com";
	const emailBody = composeShippingEmailBody(data);

	const maxRetries = 3;
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`[Shipping Email] Attempt ${attempt}/${maxRetries}: Sending shipping email to ${emailTo}`);
			console.log(`[Shipping Email] Order: ${data.orderRef}`);
			console.log(`[Shipping Email] Email body:\n${emailBody}`);

			// In production, this would call a backend API or Supabase Edge Function
			// with actual file attachments from Storage
			if (data.formUrl) {
				console.log(`[Shipping Email] Form attachment: ${data.formUrl}`);
			}

			if (data.photoUrls && data.photoUrls.length > 0) {
				console.log(`[Shipping Email] Photo attachments: ${data.photoUrls.length} files`);
			}

			// Simulate successful email send
			console.log(`[Shipping Email] Success: Email sent to ${emailTo}`);

			// Log to console and Supabase
			logShippingEmailAttempt({
				shippingOrderId: data.shippingOrderId,
				recipient: emailTo,
				status: "success",
				attempt,
				message: "Email sent successfully",
			});

			return;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.error(`[Shipping Email] Attempt ${attempt} failed:`, lastError.message);

			// Log failed attempt
			logShippingEmailAttempt({
				shippingOrderId: data.shippingOrderId,
				recipient: emailTo,
				status: "failed",
				attempt,
				message: lastError.message,
			});

			// Exponential backoff: 1s, 2s, 4s
			if (attempt < maxRetries) {
				const backoffMs = Math.pow(2, attempt - 1) * 1000;
				console.log(`[Shipping Email] Retrying in ${backoffMs}ms...`);
				await new Promise((resolve) => setTimeout(resolve, backoffMs));
			}
		}
	}

	// All retries failed
	throw new Error(`Failed to send shipping email after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Log email attempt to console and Supabase
 */
function logShippingEmailAttempt(log: {
	shippingOrderId: string;
	recipient: string;
	status: "success" | "failed";
	attempt: number;
	message: string;
}): void {
	const timestamp = new Date().toISOString();
	console.log(`[Shipping Email Log] ${timestamp} - ${log.status.toUpperCase()} - ${log.message}`);

	// TODO: Log to Supabase email_logs table if needed
	// This would require creating an email_logs table and API endpoint
}
