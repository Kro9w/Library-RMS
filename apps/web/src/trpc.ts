import { createTRPCReact } from '@trpc/react-query';
// Use a relative path to import the type from the 'api' workspace
import { AppRouter } from '../../api/src/trpc/trpc.router';
import { httpBatchLink } from '@trpc/client';
import { supabase } from './supabase'; // Import the new supabase client

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // FIX: This logic was inverted.
  // In the browser (window is defined), we MUST use the full VITE_API_URL.
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_API_URL ?? 'http://localhost:2000';
  }
  // On the server, we can use the relative path (this is for SSR, not critical now)
  return 'http://localhost:2000';
};

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // Now this will correctly resolve to 'http://localhost:3000/trpc'
      url: `${getBaseUrl()}/trpc`,
      async headers() {
        // Get the session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return {};
        }

        // Send the access token in the Authorization header
        return {
          Authorization: `Bearer ${session.access_token}`,
        };
      },
    }),
  ],
});