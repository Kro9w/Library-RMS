import { TRPCError } from '@trpc/server';

export function handleTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  } else if (error instanceof Error) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  } else {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unknown error occurred',
    });
  }
}
