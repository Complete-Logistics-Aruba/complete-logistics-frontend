/**
 * Shipping Email utility functions
 * Uses email service to send shipping confirmation emails with attachments
 * Sends shipping confirmation emails with form and photo attachments
 */

import { supabase } from "@/lib/auth/supabase-client";
import { fileUrlToBase64, sendEmail } from "@/lib/email-service";

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
 * Send shipping confirmation email with attachments
 * Uses the same email service as Screen 2 for consistency
 */
export async function sendShippingEmail(data: ShippingEmailData): Promise<void> {
	const emailTo =
		import.meta.env.VITE_SHIPPING_EMAIL_TO || import.meta.env.VITE_EMAIL_TO_SHIPPING || "shipping@example.com";
	const emailBody = composeShippingEmailBody(data);

	try {
		// Prepare attachments array
		const attachments = [];

		// Add form attachment if provided
		if (data.formUrl) {
			try {
				const formPublicUrl = supabase.storage.from("shipping").getPublicUrl(data.formUrl).data.publicUrl;
				const formBase64 = await fileUrlToBase64(formPublicUrl);
				const filename = data.formUrl.split("/").pop() || "shipping-form.pdf";
				attachments.push({
					filename,
					content: formBase64,
					contentType: filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
				});
			} catch (formError) {
				console.warn("[Shipping Email] Failed to attach form:", formError);
			}
		}

		// Add photo attachments if provided
		if (data.photoUrls && data.photoUrls.length > 0) {
			for (const photoUrl of data.photoUrls) {
				try {
					const photoPublicUrl = supabase.storage.from("shipping").getPublicUrl(photoUrl).data.publicUrl;
					const photoBase64 = await fileUrlToBase64(photoPublicUrl);
					const filename = photoUrl.split("/").pop() || `photo-${Date.now()}.jpg`;
					attachments.push({
						filename,
						content: photoBase64,
						contentType: "image/jpeg",
					});
				} catch (photoError) {
					console.warn("[Shipping Email] Failed to attach photo:", photoError);
				}
			}
		}

		// Send email using the same service as Screen 2
		await sendEmail({
			to: emailTo,
			subject: `Shipping Confirmation - ${data.orderRef}`,
			body: emailBody,
			attachments,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to send shipping email";
		console.error("[Shipping Email] Error:", message);
		throw new Error(`Failed to send shipping email: ${message}`);
	}
}
