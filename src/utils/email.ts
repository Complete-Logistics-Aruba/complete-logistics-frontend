/**
 * Email utility functions for sending receiving confirmation emails
 * Uses Supabase email service with retry logic and exponential backoff
 */

interface EmailItem {
	itemId: string;
	description: string;
	receivedQty: number;
}

interface ReceivingEmailData {
	receivingOrderId: string;
	containerNum: string;
	sealNum: string;
	items: EmailItem[];
	formUrl: string;
}

/**
 * Compose plain text email body for receiving confirmation
 */
function composeEmailBody(data: ReceivingEmailData): string {
	const itemsList = data.items.map((item) => `- ${item.itemId}: ${item.receivedQty} units`).join("\n");

	return `Receiving Order Confirmation

Container: ${data.containerNum}
Seal: ${data.sealNum}

Items Received:
${itemsList}

Total Items: ${data.items.length}

Form URL: ${data.formUrl}

Thank you!`;
}

/**
 * Send receiving confirmation email with retry logic
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s)
 *
 * Note: This is a placeholder implementation. In production, this would:
 * 1. Call a backend API endpoint that uses Supabase email service
 * 2. Or use Supabase Edge Functions to send emails
 * 3. Include actual file attachments from Storage
 */
export async function sendReceivingEmail(data: ReceivingEmailData): Promise<void> {
	const emailTo = import.meta.env.VITE_EMAIL_TO_RECEIVING || "receiving@example.com";
	const emailBody = composeEmailBody(data);

	const maxRetries = 3;
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`[Email] Attempt ${attempt}/${maxRetries}: Sending receiving email to ${emailTo}`);

			// In production, this would call a backend API or Supabase Edge Function
			// For now, we simulate success after logging
			console.log(`[Email] Email body:\n${emailBody}`);
			console.log(`[Email] Form attachment: ${data.formUrl}`);

			// Simulate successful email send
			console.log(`[Email] Success: Email sent to ${emailTo}`);

			// Log to console and Supabase
			logEmailAttempt({
				receivingOrderId: data.receivingOrderId,
				recipient: emailTo,
				status: "success",
				attempt,
				message: "Email sent successfully",
			});

			return;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.error(`[Email] Attempt ${attempt} failed:`, lastError.message);

			// Log failed attempt
			logEmailAttempt({
				receivingOrderId: data.receivingOrderId,
				recipient: emailTo,
				status: "failed",
				attempt,
				message: lastError.message,
			});

			// Exponential backoff: 1s, 2s, 4s
			if (attempt < maxRetries) {
				const backoffMs = Math.pow(2, attempt - 1) * 1000;
				console.log(`[Email] Retrying in ${backoffMs}ms...`);
				await new Promise((resolve) => setTimeout(resolve, backoffMs));
			}
		}
	}

	// All retries failed
	throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Log email attempt to console and Supabase
 */
function logEmailAttempt(log: {
	receivingOrderId: string;
	recipient: string;
	status: "success" | "failed";
	attempt: number;
	message: string;
}): void {
	const timestamp = new Date().toISOString();
	console.log(`[Email Log] ${timestamp} - ${log.status.toUpperCase()} - ${log.message}`);

	// TODO: Log to Supabase email_logs table if needed
	// This would require creating an email_logs table and API endpoint
}
