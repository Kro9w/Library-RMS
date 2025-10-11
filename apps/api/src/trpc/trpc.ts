import { createTRPCReact, CreateTRPCReact } from '@trpc/react-query';
import type { Context } from './trpc.context';
import { initTRPC } from '@trpc/server';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './trpc.router';

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
const t = initTRPC.context<Context>().create();
export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});



