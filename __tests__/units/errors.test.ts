import actionError from "@/lib/action-utils/action-error";
import { ZodError } from "zod";

describe("actionError", () => {
  test("handles regular Error objects", () => {
    const error = new Error("Something went wrong");
    const result = actionError(error);
    expect(result).toEqual({ error: "Something went wrong" });
  });

  test("handles ZodError objects", () => {
    const zodError = new ZodError([
      { code: "custom", message: "Invalid input", path: ["name"] },
    ]);

    const result = actionError(zodError);
    expect(result).toEqual({ fieldErrors: { name: ["Invalid input"] } });
  });

  test("handles non-Error objects", () => {
    const result = actionError("A string error");
    expect(result).toEqual({ error: "An error occurred" });
  });

  test("handles objects without message property", () => {
    const result = actionError({ notAMessage: true });
    expect(result).toEqual({ error: "An error occurred" });
  });

  test("handles null and undefined", () => {
    expect(actionError(null)).toEqual({ error: "An error occurred" });
    expect(actionError(undefined)).toEqual({ error: "An error occurred" });
  });
});
