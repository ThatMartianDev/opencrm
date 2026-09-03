import { z } from "zod";

import { feedbackTypes } from "./options";

const feedbackTypeValues = feedbackTypes.map((type) => type.value) as [
  (typeof feedbackTypes)[number]["value"],
  ...(typeof feedbackTypes)[number]["value"][],
];

export const feedbackSchema = z.object({
  type: z.enum(feedbackTypeValues, {
    error: "Choose a feedback type.",
  }),
  message: z
    .string()
    .trim()
    .min(10, { error: "Tell us a little more about your feedback." })
    .max(5000, { error: "Keep your message under 5,000 characters." }),
  email: z
    .email({ error: "Enter a valid email address." })
    .trim()
    .max(254, { error: "Enter a valid email address." }),
  website: z.string().max(200).optional(),
});

export type FeedbackField = "type" | "message" | "email";

export type FeedbackState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<FeedbackField, string[]>>;
};