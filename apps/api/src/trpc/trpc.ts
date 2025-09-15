import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

// 1. Import the AppRouter *type* from your backend.
//    This path goes from `apps/web/src/` up to the root, then down into `apps/api/src/`.
import type { AppRouterType } from './trpc.router';

// 2. Create the tRPC hook for your frontend.
export const trpc = createTRPCReact<AppRouterType>();

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

