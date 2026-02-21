// apps/api/src/trpc/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, Organization } from '@prisma/client';

export type UserWithRoles = User & {
  roles: Role[];
  organization: Organization | null;
};

export type Context = {
  user: any; // Supabase user
  dbUser?: UserWithRoles; // Updated type
  prisma: PrismaService;
};

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Fetch user with roles and organization in one go
  const dbUser = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    include: {
      roles: true,
      organization: true,
    },
  });

  if (!dbUser) {
    // If authenticated via Supabase but not in our DB, we might want to throw or handle it.
    // Usually strict authed procedures expect the user to exist in DB.
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User record not found in database.',
    });
  }

  return next({
    ctx: {
      user: ctx.user,
      dbUser: dbUser, // Pass the enriched DB user to the context
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
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const supabaseAuthedProcedure = t.procedure.use(isSupabaseAuthed);

// Helper function to check permissions
export const checkPermission = (
  user: UserWithRoles | undefined,
  permission: keyof Role,
) => {
  if (!user || !user.roles) return false;
  // We only care if *any* role has the permission
  return user.roles.some((role) => role[permission] === true);
};

// Helper function to enforce permissions
export const requirePermission = (
  user: UserWithRoles | undefined,
  permission: keyof Role,
) => {
  if (!checkPermission(user, permission)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You do not have permission to ${permission}.`,
    });
  }
};
