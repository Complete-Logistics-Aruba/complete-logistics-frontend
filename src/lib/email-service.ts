/**
 * Email Service
 *
 * Handles email sending and file conversion utilities for the WMS application.
 * Integrates with Supabase Edge Functions for email delivery.
 */

/**
 * Convert a file URL to base64 string
 * Used for attaching files to emails
 *
 * @param url - The URL of the file to convert
 * @returns Base64 encoded string of the file
 * @throws Error if file cannot be fetched or converted
 */
export async function fileUrlToBase64(url: string): Promise<string> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch file: ${response.statusText}`);
		}
		const blob = await response.blob();
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.addEventListener("loadend", () => {
				const base64 = reader.result as string;
				// Remove the data:*;base64, prefix if present
				resolve(base64.split(",")[1] || base64);
			});
			reader.addEventListener("error", () => {
				reject(new Error("Failed to read file"));
			});
			reader.readAsDataURL(blob);
		});
	} catch (error) {
		throw new Error(`Failed to convert file to base64: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Email attachment object
 */
export interface EmailAttachment {
	filename: string;
	content: string; // Base64 encoded content
	contentType: string; // MIME type (e.g., "application/pdf", "image/jpeg")
}

/**
 * Email payload for sending
 */
export interface EmailPayload {
	to: string;
	subject: string;
	body: string;
	attachments?: EmailAttachment[];
}

/**
 * Send email via Supabase Edge Function
 *
 * @param payload - Email payload with recipient, subject, body, and optional attachments
 * @throws Error if email sending fails
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
	try {
		// Get the Supabase URL from environment
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
		if (!supabaseUrl) {
			throw new Error("VITE_SUPABASE_URL not configured");
		}

		// Call the send-email edge function
		const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				// Authorization header will be added by Supabase client
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || `Email sending failed: ${response.statusText}`);
		}

		const result = await response.json();
		console.log("[Email Service] Email sent successfully:", result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[Email Service] Failed to send email:", message);
		throw new Error(`Failed to send email: ${message}`);
	}
}
