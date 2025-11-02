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
            include: { organization: true },
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
        .input(z.object({ orgName: z.string().min(1) }))
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
              users: {
                connect: { id: ctx.dbUser.id },
              },
            },
          });

          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: { role: Role.OWNER, organizationId: newOrg.id },
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

          await this.prisma.user.update({
            where: { id: ctx.dbUser.id },
            data: {
              organizationId: org.id,
              role: Role.USER,
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
    });
  }
}