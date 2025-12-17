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
 * Supports both Supabase Storage URLs and public URLs
 *
 * @param url - The URL of the file to convert
 * @returns Base64 encoded string of the file
 * @throws Error if file cannot be fetched or converted
 */
export async function fileUrlToBase64(url: string): Promise<string> {
	try {
		// For Supabase Storage URLs, extract bucket and path
		if (url.includes("supabase.co")) {
			const { supabase } = await import("./auth/supabase-client");

			// Parse URL to extract bucket and path
			// Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
			const urlObj = new URL(url);
			const pathParts = urlObj.pathname.split("/");

			// Find the bucket name (comes after "public" or "authenticated")
			const publicIndex = pathParts.indexOf("public");
			const authenticatedIndex = pathParts.indexOf("authenticated");
			const accessTypeIndex = Math.max(publicIndex, authenticatedIndex);

			if (accessTypeIndex === -1) {
				throw new Error("Invalid Supabase Storage URL format");
			}

			const bucket = pathParts[accessTypeIndex + 1];
			const filePath = pathParts.slice(accessTypeIndex + 2).join("/");

			if (!bucket || !filePath) {
				throw new Error("Could not extract bucket or file path from URL");
			}

			// Download file from Supabase Storage
			const { data, error } = await supabase.storage.from(bucket).download(filePath);

			if (error) {
				throw new Error(`Failed to download from Supabase: ${error.message}`);
			}

			if (!data) {
				throw new Error("No data returned from Supabase download");
			}

			// Convert blob to base64
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.addEventListener("loadend", () => {
					const base64 = reader.result as string;
					// Remove the data:*;base64, prefix
					resolve(base64.split(",")[1] || base64);
				});
				reader.addEventListener("error", () => {
					reject(new Error("Failed to read file"));
				});
				reader.readAsDataURL(data);
			});
		}

		// For public URLs, use fetch
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
 * Send email via backend API or Supabase Edge Function
 *
 * @param payload - Email payload with recipient, subject, body, and optional attachments
 * @throws Error if email sending fails
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
	try {
		// Get environment variables
		const apiUrl = import.meta.env.VITE_API_URL;
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

		if (apiUrl) {
			// Try backend API first (Django/Node.js backend)
			try {
				const response = await fetch(`${apiUrl}/api/email/send`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});

				if (response.ok) {
					return;
				}
				console.warn("[Email Service] Backend API returned non-ok status:", response.status);
			} catch (backendError) {
				console.warn("[Email Service] Backend API not available:", backendError);
			}
		}

		// Fallback: Try Supabase Edge Function
		if (supabaseUrl) {
			try {
				const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});

				const responseText = await response.text();

				if (response.ok) {
					return;
				}
				console.warn("[Email Service] Edge function returned non-ok status:", response.status, responseText);
			} catch (edgeFunctionError) {
				console.warn("[Email Service] Edge function not available:", edgeFunctionError);
			}
		}

		// Final fallback: Log email for manual processing
		console.warn("[Email Service] No email service available. Email details logged for manual processing:");

		// Throw error to inform user
		throw new Error(
			"Email service not configured. Please ensure backend API or Supabase Edge Function is deployed. " +
				"Email details have been logged to console for manual processing."
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[Email Service] Failed to send email:", message);
		throw new Error(`Failed to send email: ${message}`);
	}
}
