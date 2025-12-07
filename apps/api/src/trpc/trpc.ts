// apps/api/src/trpc/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

export type Context = {
  user: any; // Supabase user
  dbUser?: User;
  prisma: PrismaService;
};

const t = initTRPC
  .context<Context>()
  .meta<OpenApiMeta>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Restore logic: Fetch user from DB
  const dbUser = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
  });

  if (!dbUser) {
    // If authenticated via Supabase but not in our DB, we might want to throw or handle it.
    // Usually strict authed procedures expect the user to exist in DB.
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'User record not found in database.'
    });
  }

  return next({
    ctx: {
      user: ctx.user,
      dbUser: dbUser, // Pass the DB user to the context
    },
  });
});

const isSupabaseAuthed = t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            user: ctx.user,
        }
    })
})

export const protectedProcedure = t.procedure.use(isAuthed);
export const supabaseAuthedProcedure = t.procedure.use(isSupabaseAuthed);
