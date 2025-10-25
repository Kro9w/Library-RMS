// apps/api/src/user/user.router.ts
import {
  router,
  onboardingProcedure,
  authedProcedure,
  userProcedure, // <-- 1. IMPORT THE NEW PROCEDURE
} from '../trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRouter {
  router = router({
    /**
     * Get the current user's DB record.
     * This correctly uses onboardingProcedure.
     */
    getMe: onboardingProcedure.query(async ({ ctx }) => {
      if (!ctx.firebaseUser) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      const dbUser = await ctx.prisma.user.findUnique({
        where: { firebaseUid: ctx.firebaseUser.uid },
        include: { organization: true },
      });

      return dbUser;
    }),

    /**
     * Creates the user record in our database.
     * This correctly uses onboardingProcedure.
     */
    create: onboardingProcedure
      .input(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { firebaseUser } = ctx;

        // Check if user already exists
        const existingUser = await ctx.prisma.user.findFirst({
          where: {
            OR: [
              { firebaseUid: firebaseUser.uid },
              { email: input.email },
            ],
          },
        });

        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User already exists.',
          });
        }

        const user = await ctx.prisma.user.create({
          data: {
            firebaseUid: firebaseUser.uid,
            email: input.email,
            name: input.name,
            imageUrl: firebaseUser.picture,
          },
        });

        return user;
      }),

    /**
     * Creates a new organization and links the current user to it.
     */
    createOrganization: userProcedure // <-- 2. CHANGED TO userProcedure
      .input(
        z.object({
          name: z.string().min(2),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // User must not already be in an organization
        if (ctx.dbUser.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is already in an organization.',
          });
        }

        const organization = await ctx.prisma.organization.create({
          data: {
            name: input.name,
          },
        });

        const updatedUser = await ctx.prisma.user.update({
          where: { id: ctx.dbUser.id },
          data: {
            organizationId: organization.id,
          },
        });

        return { user: updatedUser, organization };
      }),

    /**
     * Joins an existing organization.
     */
    joinOrganization: userProcedure // <-- 3. CHANGED TO userProcedure
      .input(
        z.object({
          organizationName: z.string().min(2),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.dbUser.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is already in an organization.',
          });
        }

        const organization = await ctx.prisma.organization.findFirst({
          where: { name: input.organizationName },
        });

        if (!organization) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organization not found.',
          });
        }

        const updatedUser = await ctx.prisma.user.update({
          where: { id: ctx.dbUser.id },
          data: {
            organizationId: organization.id,
          },
        });

        return { user: updatedUser, organization };
      }),
  });
}