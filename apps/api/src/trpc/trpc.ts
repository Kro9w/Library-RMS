import { initTRPC, TRPCError } from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';
import { SupabaseUser } from '../types/express';

export type UserWithRoles = User & {
  roles: Role[];
};

export type Context = {
  user: SupabaseUser | null;
  dbUser?: UserWithRoles;
  prisma: PrismaService;
};

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const dbUser = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    include: {
      roles: true,
    },
  });

  if (!dbUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User record not found in database.',
    });
  }

  return next({
    ctx: {
      user: ctx.user,
      dbUser,
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

export const checkPermission = (
  user: UserWithRoles | undefined,
  permission: keyof Role,
) => {
  if (!user?.roles) return false;
  if (user.roles.some((role: Role) => role.canManageInstitution)) return true;
  return user.roles.some((role: Role) => role[permission] === true);
};

export const requirePermission = (
  user: UserWithRoles | undefined,
  permission: keyof Role,
) => {
  if (!checkPermission(user, permission)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You do not have permission to ${String(permission)}.`,
    });
  }
};
