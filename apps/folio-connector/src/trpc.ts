import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../api/src/trpc/trpc.router';

let accessToken: string | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers() {
        if (!accessToken) {
          return {};
        }
        return {
          Authorization: `Bearer ${accessToken}`,
        };
      },
    }),
  ],
});
