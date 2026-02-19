import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, requirePermission, router } from '../trpc/trpc';
import { TRPCError } from '@trpc/server';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesRouter {
  constructor(private readonly prisma: PrismaService) {}

  createRouter() {
    return router({
      getRoles: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.dbUser.campusId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'User does not belong to a campus.',
          });
        }
        return ctx.prisma.role.findMany({
          where: {
            campusId: ctx.dbUser.campusId,
          },
          orderBy: {
            level: 'asc', // 1 (Leader) -> 4 (Member)
          },
        });
      }),

      createRole: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            level: z.number().min(1).max(4).default(4),
            // Optional overrides
            canManageUsers: z.boolean().optional(),
            canManageRoles: z.boolean().optional(),
            canManageDocuments: z.boolean().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageRoles');
          if (!ctx.dbUser.campusId) {
             throw new TRPCError({ code: 'BAD_REQUEST', message: 'No Campus ID found for user.' });
          }

          // Determine permissions based on level if not provided
          const defaults = this.getPermissionsForLevel(input.level);
          
          return ctx.prisma.role.create({
            data: {
              name: input.name,
              level: input.level,
              campusId: ctx.dbUser.campusId,
              canManageUsers: input.canManageUsers ?? defaults.canManageUsers,
              canManageRoles: input.canManageRoles ?? defaults.canManageRoles,
              canManageDocuments: input.canManageDocuments ?? defaults.canManageDocuments,
            },
          });
        }),

      updateRole: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().optional(),
            level: z.number().min(1).max(4).optional(),
            canManageUsers: z.boolean().optional(),
            canManageRoles: z.boolean().optional(),
            canManageDocuments: z.boolean().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageRoles');
          
          // Fetch existing role to check ownership
          const existingRole = await ctx.prisma.role.findUnique({
             where: { id: input.id }
          });
          
          if (!existingRole || existingRole.campusId !== ctx.dbUser.campusId) {
             throw new TRPCError({ code: 'FORBIDDEN', message: 'Role not found or access denied.' });
          }

          // If level changes, update permissions if they are not explicitly set? 
          // Logic: "Base Authority Level" sets defaults. If user changes level, we might want to update permissions too.
          // BUT the prompt says "level dictates default permissions". 
          // Let's adopt a safe approach: If level changes, only update defaults if permissions are NOT provided in input.
          
          let permissionsUpdate = {};
          if (input.level) {
              const defaults = this.getPermissionsForLevel(input.level);
              permissionsUpdate = {
                  canManageUsers: input.canManageUsers ?? defaults.canManageUsers,
                  canManageRoles: input.canManageRoles ?? defaults.canManageRoles,
                  canManageDocuments: input.canManageDocuments ?? defaults.canManageDocuments,
              };
          } else {
              // Level not changing, just update explicit permissions if present
               if (input.canManageUsers !== undefined) permissionsUpdate['canManageUsers'] = input.canManageUsers;
               if (input.canManageRoles !== undefined) permissionsUpdate['canManageRoles'] = input.canManageRoles;
               if (input.canManageDocuments !== undefined) permissionsUpdate['canManageDocuments'] = input.canManageDocuments;
          }

          return ctx.prisma.role.update({
            where: { id: input.id },
            data: {
              name: input.name,
              level: input.level,
              ...permissionsUpdate
            },
          });
        }),

      deleteRole: protectedProcedure
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageRoles');
          const role = await ctx.prisma.role.findUnique({ where: { id: input } });
           if (!role || role.campusId !== ctx.dbUser.campusId) {
             throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied.' });
          }
          return ctx.prisma.role.delete({ where: { id: input } });
        }),

      assignRoleToUser: protectedProcedure
        .input(z.object({ userId: z.string(), roleId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageRoles');
          
          const role = await ctx.prisma.role.findUnique({ where: { id: input.roleId } });
          if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found' });
          
          // 1. Check if trying to assign Level 1
          if (role.level === 1) {
             // 2. Get target user's department
             const targetUser = await ctx.prisma.user.findUnique({ 
                 where: { id: input.userId },
                 include: { department: true } 
             });
             
             if (!targetUser || !targetUser.departmentId) {
                  throw new TRPCError({ code: 'BAD_REQUEST', message: 'User must belong to a department to be a leader.' });
             }

             // 3. Check if this Department already has a Level 1 leader
             const existingLeader = await ctx.prisma.user.findFirst({
                 where: {
                     departmentId: targetUser.departmentId,
                     roles: {
                         some: { level: 1 }
                     },
                     id: { not: targetUser.id } // Exclude self (re-assignment is fine)
                 }
             });

             if (existingLeader) {
                 throw new TRPCError({ 
                     code: 'PRECONDITION_FAILED', 
                     message: `Department '${targetUser.department?.name}' already has a leader (${existingLeader.firstName} ${existingLeader.lastName}). Please demote them first.` 
                 });
             }
          }

          return ctx.prisma.user.update({
            where: { id: input.userId },
            data: {
              roles: { connect: { id: input.roleId } },
            },
          });
        }),

      unassignRoleFromUser: protectedProcedure
        .input(z.object({ userId: z.string(), roleId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageRoles');
          return ctx.prisma.user.update({
            where: { id: input.userId },
            data: {
              roles: { disconnect: { id: input.roleId } },
            },
          });
        }),
    });
  }

  private getPermissionsForLevel(level: number) {
      switch (level) {
          case 1: // Leader
              return { canManageUsers: true, canManageRoles: true, canManageDocuments: true };
          case 2: // Co-Leader
              return { canManageUsers: false, canManageRoles: false, canManageDocuments: true };
          case 3: // Elder
              return { canManageUsers: false, canManageRoles: false, canManageDocuments: false };
          case 4: // Member
          default:
              return { canManageUsers: false, canManageRoles: false, canManageDocuments: false };
      }
  }
}
