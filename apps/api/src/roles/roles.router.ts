
// apps/api/src/roles/roles.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { router, protectedProcedure, requirePermission } from '../trpc/trpc';
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
            // Campus ID is now required to scope the role
            campusId: z.string().min(1)
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requirePermission(ctx.dbUser, 'canManageRoles');

          if (!ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'User does not belong to an organization.',
            });
          }

          // TODO: Verify that ctx.dbUser has access to this campus (e.g. is Admin of the Org or Admin of the Campus)
          // For now, relying on 'canManageRoles' which is organization/campus scoped.

          return await this.rolesService.createRole(
            {
              name: input.name,
              canManageUsers: input.canManageUsers,
              canManageRoles: input.canManageRoles,
              canManageDocuments: input.canManageDocuments,
              campusId: input.campusId,
            },
            ctx.dbUser.id,
          );
        }),

      getRoles: protectedProcedure
        .input(z.object({ campusId: z.string().optional() }).optional())
        .query(async ({ ctx, input }) => {
            if (!ctx.dbUser.organizationId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'User does not belong to an organization.',
                });
            }

            if (input?.campusId) {
                return await this.rolesService.getRolesByCampus(input.campusId);
            } else {
                // Return all roles in the organization (legacy behavior for Org Admins)
                return await this.rolesService.getRolesByOrganization(ctx.dbUser.organizationId);
            }
      }),

      getUserRoles: protectedProcedure
        .input(z.string())
        .query(async ({ input: userId }) => {
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
          requirePermission(ctx.dbUser, 'canManageRoles');
          
          return await this.rolesService.updateRole(
            input.id,
            {
                name: input.name,
                canManageUsers: input.canManageUsers,
                canManageRoles: input.canManageRoles,
                canManageDocuments: input.canManageDocuments
            },
            ctx.dbUser.id,
          );
        }),

      deleteRole: protectedProcedure
        .input(z.string())
        .mutation(async ({ input, ctx }) => {
          requirePermission(ctx.dbUser, 'canManageRoles');

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
          requirePermission(ctx.dbUser, 'canManageRoles');

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
          requirePermission(ctx.dbUser, 'canManageRoles');

          return await this.rolesService.unassignRoleFromUser(
            input.userId,
            input.roleId,
            ctx.dbUser.id,
          );
        }),
    });
  }
}
