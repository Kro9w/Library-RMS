import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

// 1. Import the 'AppRouter' type (not 'AppRouterType') from the correct backend path.
import type { AppRouter } from './trpc.router';

// 2. Use the correct 'AppRouter' type when creating the hook.
export const trpc = createTRPCReact<AppRouter>();

// 3. Create and export a tRPC client for the provider.
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // The URL of your tRPC server.
      url: 'http://localhost:3000/trpc',
      
      // Headers can be added here for auth
      async headers() {
        return {};
      },
    }),
  ],
});

