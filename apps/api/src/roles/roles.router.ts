// apps/api/src/roles/roles.router.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';

export const rolesRouter = router({
  createRole: protectedProcedure
    .input(z.object({
      name: z.string(),
      canManageUsers: z.boolean().optional(),
      canManageRoles: z.boolean().optional(),
      canManageDocuments: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRoles = await ctx.prisma.userRole.findMany({
        where: { userId: ctx.dbUser.id },
        include: { role: true },
      });

      const canManageRoles = userRoles.some(
        (userRole) => userRole.role.canManageRoles
      );

      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create roles.',
        });
      }

      if (!ctx.dbUser.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User does not belong to an organization.',
        });
      }
      
      return await ctx.rolesService.createRole({
        ...input,
        organizationId: ctx.dbUser.organizationId,
      });
    }),

  getRoles: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.dbUser.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User does not belong to an organization.',
        });
      }
      return await ctx.rolesService.getRoles(ctx.dbUser.organizationId);
    }),

  getRoleById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      return await ctx.rolesService.getRoleById(input);
    }),

  updateRole: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      canManageUsers: z.boolean().optional(),
      canManageRoles: z.boolean().optional(),
      canManageDocuments: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRoles = await ctx.prisma.userRole.findMany({
        where: { userId: ctx.dbUser.id },
        include: { role: true },
      });

      const canManageRoles = userRoles.some(
        (userRole) => userRole.role.canManageRoles
      );

      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update roles.',
        });
      }
      return await ctx.rolesService.updateRole(input.id, input);
    }),

  deleteRole: protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const userRoles = await ctx.prisma.userRole.findMany({
        where: { userId: ctx.dbUser.id },
        include: { role: true },
      });

      const canManageRoles = userRoles.some(
        (userRole) => userRole.role.canManageRoles
      );

      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete roles.',
        });
      }
      return await ctx.rolesService.deleteRole(input);
    }),

  assignRoleToUser: protectedProcedure
    .input(z.object({
      userId: z.string(),
      roleId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRoles = await ctx.prisma.userRole.findMany({
        where: { userId: ctx.dbUser.id },
        include: { role: true },
      });

      const canManageRoles = userRoles.some(
        (userRole) => userRole.role.canManageRoles
      );

      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to assign roles.',
        });
      }
      return await ctx.rolesService.assignRoleToUser(input.userId, input.roleId);
    }),

  unassignRoleFromUser: protectedProcedure
    .input(z.object({
      userId: z.string(),
      roleId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userRoles = await ctx.prisma.userRole.findMany({
        where: { userId: ctx.dbUser.id },
        include: { role: true },
      });

      const canManageRoles = userRoles.some(
        (userRole) => userRole.role.canManageRoles
      );

      if (!canManageRoles) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to unassign roles.',
        });
      }
      return await ctx.rolesService.unassignRoleFromUser(input.userId, input.roleId);
    }),
});
