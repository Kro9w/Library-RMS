import { createTRPCReact } from '@trpc/react-query';
import { AppRouter } from '../../api/src/trpc/trpc.router';
import { httpBatchLink } from '@trpc/client';
import { supabase } from './supabase';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_API_URL ?? 'http://localhost:2000';
  }
  return 'http://localhost:2000';
};

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      async headers() {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return {};
        }
        return {
          Authorization: `Bearer ${session.access_token}`,
        };
      },
    }),
  ],
});
