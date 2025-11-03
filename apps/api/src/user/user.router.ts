// apps/api/src/user/user.router.ts

import { z } from 'zod';
import {
  protectedProcedure,
  publicProcedure,
  router,
  supabaseAuthedProcedure,
} from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { Role } from '@prisma/client';

@Injectable()
export class UserRouter {
  constructor(private readonly prisma: PrismaService) {}

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

          const user = await this.prisma.user.findUnique({
            where: { id: authUser.id },
          });

          if (user) {
            return user;
          }

          const newUser = await this.prisma.user.create({
            data: {
              id: authUser.id,
              email: input.email,
              name: input.name,
            },
          });
          return newUser;
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
          const userWithOrg = await ctx.prisma.user.findUnique({
            where: { id: ctx.dbUser.id },
            // Select all fields, including relations
            include: {
              organization: true,
              roles: {
                include: {
                  role: true,
                },
              },
            },
          });

          if (!userWithOrg) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'User not found.',
            });
          }
          return userWithOrg;
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

          await this.prisma.userRole.create({
            data: {
              userId: ctx.dbUser.id,
              roleId: adminRole.id,
            },
          });

          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: { organizationId: newOrg.id },
          });

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

          // Update only the organizationId on the user (there is no scalar `role` on the user model)
          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              organizationId: org.id,
            },
          });

          // Assign a "User" role to the joining user by creating a userRole entry.
          // Try to find an existing role named 'User' for this organization; if none exists, create it.
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

          await this.prisma.userRole.create({
            data: {
              userId: ctx.dbUser.id,
              roleId: userRoleRecord.id,
            },
          });

          return org;
        }),

      // --- 2. NEW MUTATION (SYNTAX FIXED) ---
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
              // Only update imageUrl if a new one was provided
              ...(input.imageUrl && { imageUrl: input.imageUrl }),
            },
          });
        }),
      // --- END OF NEW MUTATION ---
      
      // --- NEW MUTATION ---
      deleteUser: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const userRoles = await ctx.prisma.userRole.findMany({
            where: { userId: ctx.dbUser.id },
            include: { role: true },
          });

          const canManageUsers = userRoles.some(
            (userRole) => userRole.role.canManageUsers
          );

          if (!canManageUsers) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to delete users.',
            });
          }

          return ctx.prisma.user.delete({
            where: { id: input.userId },
          });
        }),
      // --- END OF NEW MUTATION ---
      
      // --- NEW QUERY ---
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
            roles: {
              include: {
                role: true,
              },
            },
          },
        });
      }),
      // --- END OF NEW QUERY ---

      // --- NEW QUERY ---
      getAllOrgs: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.organization.findMany();
      }),
      // --- END OF NEW QUERY ---

      // --- NEW MUTATION ---
      removeUserFromOrg: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const userRoles = await ctx.prisma.userRole.findMany({
            where: { userId: ctx.dbUser.id },
            include: { role: true },
          });

          const canManageUsers = userRoles.some(
            (userRole) => userRole.role.canManageUsers
          );

          if (!canManageUsers) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have permission to remove users from the organization.',
            });
          }

          return ctx.prisma.user.update({
            where: { id: input.userId },
            data: {
              organizationId: null,
            },
          });
        }),
      // --- END OF NEW MUTATION ---
    });
  }
}