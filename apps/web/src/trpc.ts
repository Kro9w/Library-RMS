import { createTRPCReact } from '@trpc/react-query';
// We must separate the type import from the value import.
import type { CreateTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

// 1. Import the correct 'AppRouter' type from your backend router file.
//    The path goes from apps/web/src/ -> apps/web/ -> apps/ -> root -> apps/api/src/...
import type { AppRouter } from '../../api/src/trpc/trpc.router';

// 2. Create the tRPC hook for your frontend using the correct AppRouter type.
//    We add an explicit type annotation here to resolve the TS(2742) error.
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

// 3. Create and export the tRPC client directly from the hook object.
//    This is the standard pattern for React applications.
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // The URL for your tRPC server. This should match the port your
      // NestJS backend is running on.
      url: 'http://localhost:3000/trpc',
    }),
  ],
});

