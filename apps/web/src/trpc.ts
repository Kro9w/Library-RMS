// apps/web/src/trpc.ts
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
// Make sure this path is correct for your monorepo setup
import type { AppRouter } from '../../api/src/trpc/trpc.router'; 
import superjson from 'superjson';
import { auth } from './firebase';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  // transformer: superjson, // <-- REMOVED FROM HERE
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      transformer: superjson, // <-- AND ADDED HERE
      
      // This function now gets the token from Firebase Auth
      async headers() {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return {};
        }
        const token = await currentUser.getIdToken();
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});