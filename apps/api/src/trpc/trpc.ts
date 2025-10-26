import { TRPCError, initTRPC } from '@trpc/server';
import { TrpcContext } from './trpc.context';
import { OpenApiMeta } from 'trpc-openapi';
import { User } from '@prisma/client';
import { SupabaseUser } from '../types/express'; // Import SupabaseUser type

const t = initTRPC.context<TrpcContext>().meta<OpenApiMeta>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// --- Context 1 & Middleware 1: For Syncing User ---

// FIX: Define a clean context for procedures that only need Supabase auth
export interface SupabaseAuthedContext {
  prisma: TrpcContext['prisma'];
  user: NonNullable<TrpcContext['user']>; // Just the Supabase user
}

const isAuthedWithSupabase = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  // FIX: Return the new, clean context
  return next({
    ctx: {
      prisma: ctx.prisma,
      user: ctx.user,
    },
  });
});

/**
 * A procedure that only requires a valid Supabase JWT.
 * Use this for creating/syncing the user.
 */
export const supabaseAuthedProcedure = t.procedure.use(isAuthedWithSupabase);

// --- Context 2 & Middleware 2: For All Other Protected Calls ---

export interface AuthedContext {
  prisma: TrpcContext['prisma'];
  user: NonNullable<TrpcContext['user']>;
  dbUser: User;
}

const isAuthedAndInDB = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  const dbUser = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
  });

  if (!dbUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found in database. Please sign in again.',
    });
  }

  // Pass the clean context for DB-authed procedures
  return next({
    ctx: {
      prisma: ctx.prisma,
      user: ctx.user,
      dbUser: dbUser,
    },
  });
});

/**
 * A protected procedure that requires a valid Supabase JWT
 * AND a corresponding user record in our database.
 * The context is enhanced with `ctx.dbUser`.
 */
export const protectedProcedure = t.procedure.use(isAuthedAndInDB);