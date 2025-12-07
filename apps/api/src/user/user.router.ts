// apps/api/src/user/user.router.ts

import { z } from 'zod';
import {
  protectedProcedure,
  router,
  supabaseAuthedProcedure,
  requirePermission,
} from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { LogService } from '../log/log.service';

@Injectable()
export class UserRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  createRouter() {
    return router({
      /**
       * Creates a user in our public.User table after
       * a successful Supabase signup or login.
       */
      syncUser: supabaseAuthedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/user.sync',
            tags: ['user'],
            summary: 'Sync Supabase auth user with local DB',
          },
        })
        .input(
          z.object({
            email: z.string().email(),
            name: z.string().optional(),
          }),
        )
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          const { user: authUser } = ctx; 

          // Efficient upsert
          return this.prisma.user.upsert({
            where: { id: authUser.id },
            update: {
                // We might not want to overwrite name if it's already set?
                // For now, let's keep it simple and safe.
            },
            create: {
              id: authUser.id,
              email: input.email,
              name: input.name,
            },
          });
        }),

      getMe: protectedProcedure
        .meta({
          openapi: {
            method: 'GET',
            path: '/user.getMe',
            tags: ['user'],
            summary: 'Get current user details',
          },
        })
        .input(z.void())
        .output(z.any())
        .query(async ({ ctx }) => {
          // ctx.dbUser already has organization and roles included
          return ctx.dbUser;
        }),

      createOrganization: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/user.createOrganization',
            tags: ['user', 'organization'],
            summary: 'Create a new organization',
          },
        })
        .input(z.object({ orgName: z.string().min(1), orgAcronym: z.string().min(1) }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          if (ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User already belongs to an organization.',
            });
          }

          const newOrg = await this.prisma.organization.create({
            data: {
              name: input.orgName,
              acronym: input.orgAcronym,
              users: {
                connect: { id: ctx.dbUser.id },
              },
            },
          });

          const adminRole = await this.prisma.role.create({
            data: {
              name: 'Admin',
              canManageUsers: true,
              canManageRoles: true,
              canManageDocuments: true,
              organizationId: newOrg.id,
            },
          });

          // Implicit relation: Connect user to role
          await this.prisma.user.update({
             where: { id: ctx.dbUser.id },
             data: {
                 roles: {
                     connect: { id: adminRole.id }
                 }
             }
          });

          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: { organizationId: newOrg.id },
          });

          await this.logService.logAction(
             ctx.dbUser.id,
             newOrg.id,
             `Created organization: ${newOrg.name}`,
             ['Admin'] // They just became admin
          );

          return newOrg;
        }),

      joinOrganization: protectedProcedure
        .meta({
          openapi: {
            method: 'POST',
            path: '/user.joinOrganization',
            tags: ['user', 'organization'],
            summary: 'Join an organization by ID',
          },
        })
        .input(z.object({ orgId: z.string().min(1) }))
        .output(z.any())
        .mutation(async ({ ctx, input }) => {
          if (ctx.dbUser.organizationId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User already belongs to an organization.',
            });
          }

          const org = await this.prisma.organization.findUnique({
            where: { id: input.orgId },
          });

          if (!org) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Organization not found.',
            });
          }

          // Update only the organizationId on the user
          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              organizationId: org.id,
            },
          });

          // Assign a "User" role to the joining user by creating a userRole entry.
          let userRoleRecord = await this.prisma.role.findFirst({
            where: {
              organizationId: org.id,
              name: 'User',
            },
          });

          if (!userRoleRecord) {
            userRoleRecord = await this.prisma.role.create({
              data: {
                name: 'User',
                canManageUsers: false,
                canManageRoles: false,
                canManageDocuments: false,
                organizationId: org.id,
              },
            });
          }

          // Implicit M:N connect
          await this.prisma.user.update({
             where: { id: ctx.dbUser.id },
             data: {
                 roles: {
                     connect: { id: userRoleRecord.id }
                 }
             }
          });

          await this.logService.logAction(
             ctx.dbUser.id,
             org.id,
             `Joined organization: ${org.name}`,
             ['User']
          );

          return org;
        }),

      updateProfile: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            // imageUrl is optional, but if provided, it must be a URL
            imageUrl: z.string().url().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return ctx.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              name: input.name,
              ...(input.imageUrl && { imageUrl: input.imageUrl }),
            },
          });
        }),
      
      deleteUser: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          const deletedUser = await ctx.prisma.user.delete({
            where: { id: input.userId },
          });

          await this.logService.logAction(
              ctx.dbUser.id,
              ctx.dbUser.organizationId!,
              `Deleted user: ${deletedUser.email}`,
              ctx.dbUser.roles.map(r => r.name)
          );

          return deletedUser;
        }),
      
      getUsersWithRoles: protectedProcedure.query(async ({ ctx }) => {
        if (!ctx.dbUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'User does not belong to an organization.',
          });
        }
        return ctx.prisma.user.findMany({
          where: {
            organizationId: ctx.dbUser.organizationId,
          },
          include: {
            roles: true,
          },
        });
      }),

      getAllOrgs: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.organization.findMany();
      }),

      removeUserFromOrg: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          requirePermission(ctx.dbUser, 'canManageUsers');

          const updatedUser = await ctx.prisma.user.update({
            where: { id: input.userId },
            data: {
              organizationId: null,
            },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            ctx.dbUser.organizationId!,
            `Removed user: ${updatedUser.email} from organization`,
            ctx.dbUser.roles.map(r => r.name)
          );

          return updatedUser;
        }),
    });
  }
}
