"use server";

import { headers } from "next/headers";

import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { feedbackTypes } from "./options";
import { feedbackSchema, type FeedbackState } from "./schema";

const FEEDBACK_RECIPIENT = "thatmartiandev@gmail.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function submitFeedback(
  _previousState: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        type: flattened.type,
        message: flattened.message,
        email: flattened.email,
      },
    };
  }

  const { type, message, email } = parsed.data;
  if (parsed.data.website) return { success: true };

  const requestHeaders = await headers();
  const requester =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";

  const requesterLimit = rateLimit(`feedback:requester:${requester}`, 5, 60 * 60 * 1000);
  const emailLimit = rateLimit(`feedback:email:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!requesterLimit.success || !emailLimit.success) {
    return { error: "Too many submissions. Please try again later." };
  }

  const typeLabel = feedbackTypes.find((option) => option.value === type)?.label ?? type;
  const text = `Feedback type: ${typeLabel}\nFrom: ${email}\n\n${message}`;

  try {
    await sendEmail({
      to: FEEDBACK_RECIPIENT,
      replyTo: email,
      subject: `[CRM feedback] ${typeLabel}`,
      text,
      html: [
        `<p><strong>Feedback type:</strong> ${escapeHtml(typeLabel)}</p>`,
        `<p><strong>From:</strong> ${escapeHtml(email)}</p>`,
        `<p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>`,
      ].join(""),
    });
  } catch (error) {
    console.error("Failed to send product feedback:", error);
    return { error: "We could not send your feedback. Please try again." };
  }

  return { success: true };
}