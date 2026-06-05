
import { ZodError } from "zod";

interface FieldError {
  [key: string]: string[];
}

interface ActionErrorResponse {
  error?: string;
  fieldErrors?: FieldError;
}

const actionError = (error: unknown): ActionErrorResponse => {
  console.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const fieldErrors: FieldError = {};
    error.issues.forEach((err) => {
      const path = err.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });
    return { fieldErrors };
  }

  // Handle regular errors
  const message = error instanceof Error ? error.message : "An error occurred";
  return { error: message };
};

export default actionError;