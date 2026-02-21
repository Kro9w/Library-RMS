import { TRPCClientError } from "@trpc/client";

/**
 * Safely extracts a message from an unknown error.
 * Handles TRPCClientError, standard Error objects, and strings.
 * 
 * @param error The error to extract the message from
 * @param fallback A fallback message if no message can be extracted
 * @returns The error message string
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred."
): string {
  if (error instanceof TRPCClientError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return fallback;
}
