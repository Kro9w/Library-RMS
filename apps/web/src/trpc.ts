import { createTRPCReact } from '@trpc/react-query';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouterType } from '../../api/src/trpc/trpc.router'; // types only

// React hooks for tRPC
export const trpc = createTRPCReact<AppRouterType>();

// Client instance for Provider
export const trpcClient = createTRPCProxyClient<AppRouterType>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
    }),
  ],
});