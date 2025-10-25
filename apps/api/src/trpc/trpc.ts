// apps/api/src/trpc/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { TrpcContext } from './trpc.context';
import superjson from 'superjson';
import { User } from '@prisma/client';

export const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

/**
 * authedProcedure (Full Access)
 *
 * Guarantees:
 * 1. Valid Firebase Token
 * 2. Valid DB User record
 * 3. User has an Organization
 *
 * Use for main app logic (getDocuments, etc.)
 */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.firebaseUser || !ctx.dbUser || !ctx.dbUser.organizationId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated or has not joined an organization.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      firebaseUser: ctx.firebaseUser,
      dbUser: {
        ...ctx.dbUser,
        organizationId: ctx.dbUser.organizationId,
      },
    },
  });
});

/**
 * onboardingProcedure (Signup Step 1)
 *
 * Guarantees:
 * 1. Valid Firebase Token
 *
 * Use for `user.create` and `user.getMe`.
 */
export const onboardingProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.firebaseUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      firebaseUser: ctx.firebaseUser,
    },
  });
});

// --- ADD THIS NEW PROCEDURE ---
/**
 * userProcedure (Signup Step 2 - Onboarding)
 *
 * Guarantees:
 * 1. Valid Firebase Token
 * 2. Valid DB User record
 *
 * Use for org actions: `createOrganization`, `joinOrganization`.
 */
export const userProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.firebaseUser || !ctx.dbUser) {
    // This is the error we SHOULD see if something is wrong
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated or does not have a user record.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      firebaseUser: ctx.firebaseUser,
      dbUser: ctx.dbUser,
    },
  });
});
// --- END OF NEW PROCEDURE ---

export const publicProcedure = t.procedure;
export const router = t.router;