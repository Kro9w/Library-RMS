// apps/api/src/trpc/trpc.ts (backend)
import { initTRPC } from '@trpc/server';
import type { Context } from './trpc.context';

export const t = initTRPC.context<Context>().create();