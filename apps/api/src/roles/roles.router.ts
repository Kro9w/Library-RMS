// apps/api/src/roles/roles.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';
import { RolesService } from './roles.service';
import { UserService } from '../user/user.service';

@Injectable()
export class RolesRouter {
  constructor(
    private readonly rolesService: RolesService,
    private readonly userService: UserService,
  ) {}

  createRouter() {
    return router({
      createRole: protectedProcedure
        .input(
          z.object({
            name: z.string(),
            canManageUsers: z.boolean().optional(),
            canManageRoles: z.boolean().optional(),
            canManageDocuments: z.boolean().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const userRoles = await this.userService.getUserRoles(ctx.dbUser.id);
          // userRoles is now Role[]

          const canManageRoles = userRoles.some(
            (role) => role.canManageRoles,
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

          return await this.rolesService.createRole(
            {
              ...input,
              organizationId: ctx.dbUser.organizationId,
            },
            ctx.dbUser.id,
          );
        }),

      getRoles: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.dbUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'User does not belong to an organization.',
          });
        }
        return await this.rolesService.getRoles(ctx.dbUser.organizationId);
      }),

      getUserRoles: protectedProcedure
        .input(z.string())
        .query(async ({ input: userId }) => {
          // Now returns Role[] instead of UserRole[]
          return await this.userService.getUserRoles(userId);
        }),
      
      getRoleById: protectedProcedure
        .input(z.string())
        .query(async ({ input }) => {
          return await this.rolesService.getRoleById(input);
        }),

      updateRole: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().optional(),
            canManageUsers: z.boolean().optional(),
            canManageRoles: z.boolean().optional(),
            canManageDocuments: z.boolean().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const userRoles = await this.userService.getUserRoles(ctx.dbUser.id);

          const canManageRoles = userRoles.some(
            (role) => role.canManageRoles,
          );

          if (!canManageRoles) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to update roles.',
            });
          }
          return await this.rolesService.updateRole(
            input.id,
            input,
            ctx.dbUser.id,
          );
        }),

      deleteRole: protectedProcedure
        .input(z.string())
        .mutation(async ({ input, ctx }) => {
          const userRoles = await this.userService.getUserRoles(ctx.dbUser.id);

          const canManageRoles = userRoles.some(
            (role) => role.canManageRoles,
          );

          if (!canManageRoles) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to delete roles.',
            });
          }
          return await this.rolesService.deleteRole(input, ctx.dbUser.id);
        }),

      assignRoleToUser: protectedProcedure
        .input(
          z.object({
            userId: z.string(),
            roleId: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const userRoles = await this.userService.getUserRoles(ctx.dbUser.id);

          const canManageRoles = userRoles.some(
            (role) => role.canManageRoles,
          );

          if (!canManageRoles) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to assign roles.',
            });
          }
          return await this.rolesService.assignRoleToUser(
            input.userId,
            input.roleId,
            ctx.dbUser.id,
          );
        }),

      unassignRoleFromUser: protectedProcedure
        .input(
          z.object({
            userId: z.string(),
            roleId: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const userRoles = await this.userService.getUserRoles(ctx.dbUser.id);

          const canManageRoles = userRoles.some(
            (role) => role.canManageRoles,
          );

          if (!canManageRoles) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to unassign roles.',
            });
          }
          return await this.rolesService.unassignRoleFromUser(
            input.userId,
            input.roleId,
            ctx.dbUser.id,
          );
        }),
    });
  }
}
