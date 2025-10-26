import { z } from 'zod';
// 1. FIX: Import 'supabaseAuthedProcedure'
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
       * Ensures the auth user exists in our DB.
       */
      // 2. FIX: Use 'supabaseAuthedProcedure' instead of 'protectedProcedure'
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
          const { user: authUser } = ctx; // from Supabase JWT

          // 3. FIX: We CANNOT use ctx.dbUser here. We must query.
          const user = await this.prisma.user.findUnique({
            where: { id: authUser.id },
          });

          if (user) {
            // User already exists, just return it
            return user;
          }

          // New user, create them in our DB
          const newUser = await this.prisma.user.create({
            data: {
              id: authUser.id, // Use the ID from Supabase Auth
              email: input.email,
              name: input.name,
              // role is USER by default
            },
          });
          return newUser;
        }),

      // All other procedures can remain protected
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
          // The 'dbUser' from context doesn't have relations included
          // We must re-fetch to include the organization
          const userWithOrg = await ctx.prisma.user.findUnique({
            where: { id: ctx.dbUser.id },
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
    });
  }
}