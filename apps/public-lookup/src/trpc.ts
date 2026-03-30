import { createTRPCReact } from '@trpc/react-query';
// Import the type definitions from the API workspace
import type { AppRouter } from '../../api/src/trpc/trpc.router';

export const trpc = createTRPCReact<AppRouter>();
