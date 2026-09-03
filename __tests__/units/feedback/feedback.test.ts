import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { submitFeedback } from "@/modules/feedback/actions";
import { feedbackSchema } from "@/modules/feedback/schema";
import { headers } from "next/headers";

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
}));
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(),
}));
jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

const mockSendEmail = jest.mocked(sendEmail);
const mockRateLimit = jest.mocked(rateLimit);
const mockHeaders = jest.mocked(headers);

function feedbackForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    type: "bug",
    message: "The record drawer closes before the change is saved.",
    email: "person@example.com",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("feedbackSchema", () => {
  test("requires a supported type, useful message, and valid email", () => {
    const result = feedbackSchema.safeParse({
      type: "question",
      message: "short",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        type: ["Choose a feedback type."],
        message: ["Tell us a little more about your feedback."],
        email: ["Enter a valid email address."],
      });
    }
  });
});

describe("submitFeedback", () => {
  beforeEach(() => {
    mockHeaders.mockResolvedValue(
      new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }) as never,
    );
    mockRateLimit.mockReturnValue({ success: true });
    mockSendEmail.mockResolvedValue(undefined);
  });

  test("sends escaped feedback to the fixed inbox with reply-to", async () => {
    const result = await submitFeedback(
      {},
      feedbackForm({
        message: "The <script>alert('x')</script> field\nlooks wrong.",
      }),
    );

    expect(result).toEqual({ success: true });
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: "thatmartiandev@gmail.com",
      replyTo: "person@example.com",
      subject: "[CRM feedback] Bug report",
      text: expect.stringContaining("Feedback type: Bug report"),
      html: expect.stringContaining(
        "The &lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt; field<br>looks wrong.",
      ),
    });
    expect(mockRateLimit).toHaveBeenNthCalledWith(
      1,
      "feedback:requester:203.0.113.5",
      5,
      60 * 60 * 1000,
    );
    expect(mockRateLimit).toHaveBeenNthCalledWith(
      2,
      "feedback:email:person@example.com",
      3,
      60 * 60 * 1000,
    );
  });

  test("does not send invalid submissions", async () => {
    const result = await submitFeedback(
      {},
      feedbackForm({ type: "", message: "No", email: "invalid" }),
    );

    expect(result.fieldErrors).toMatchObject({
      type: ["Choose a feedback type."],
      message: ["Tell us a little more about your feedback."],
      email: ["Enter a valid email address."],
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test("silently accepts honeypot submissions without sending", async () => {
    const result = await submitFeedback(
      {},
      feedbackForm({ website: "https://spam.example" }),
    );

    expect(result).toEqual({ success: true });
    expect(mockHeaders).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test("rejects submissions over the rate limit", async () => {
    mockRateLimit
      .mockReturnValueOnce({ success: false, retryAfterMs: 1000 })
      .mockReturnValueOnce({ success: true });

    await expect(submitFeedback({}, feedbackForm())).resolves.toEqual({
      error: "Too many submissions. Please try again later.",
    });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test("returns a generic error when email delivery fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    mockSendEmail.mockRejectedValue(new Error("SMTP unavailable"));

    await expect(submitFeedback({}, feedbackForm())).resolves.toEqual({
      error: "We could not send your feedback. Please try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to send product feedback:",
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});