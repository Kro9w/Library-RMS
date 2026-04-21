import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc/trpc';
import { DispositionAction } from '@prisma/client';

@Injectable()
export class RecordsSeriesRouter {
  createRouter() {
    return router({
      getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.recordsSeries.findMany({
          orderBy: { name: 'asc' },
          include: { _count: { select: { documentTypes: true } } },
        });
      }),

      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            activeRetentionDuration: z.number().min(0).default(0),
            activeRetentionMonths: z.number().min(0).default(0),
            activeRetentionDays: z.number().min(0).default(0),
            inactiveRetentionDuration: z.number().min(0).default(0),
            inactiveRetentionMonths: z.number().min(0).default(0),
            inactiveRetentionDays: z.number().min(0).default(0),
            dispositionAction: z
              .nativeEnum(DispositionAction)
              .default(DispositionAction.ARCHIVE),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution =
            ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only global admins can manage Records Series.',
            });
          }
          return ctx.prisma.recordsSeries.create({
            data: {
              name: input.name,
              activeRetentionDuration: input.activeRetentionDuration,
              activeRetentionMonths: input.activeRetentionMonths,
              activeRetentionDays: input.activeRetentionDays,
              inactiveRetentionDuration: input.inactiveRetentionDuration,
              inactiveRetentionMonths: input.inactiveRetentionMonths,
              inactiveRetentionDays: input.inactiveRetentionDays,
              dispositionAction: input.dispositionAction,
            },
          });
        }),

      update: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1),
            activeRetentionDuration: z.number().min(0).optional(),
            activeRetentionMonths: z.number().min(0).optional(),
            activeRetentionDays: z.number().min(0).optional(),
            inactiveRetentionDuration: z.number().min(0).optional(),
            inactiveRetentionMonths: z.number().min(0).optional(),
            inactiveRetentionDays: z.number().min(0).optional(),
            dispositionAction: z.nativeEnum(DispositionAction).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution =
            ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only global admins can manage Records Series.',
            });
          }
          return ctx.prisma.recordsSeries.update({
            where: { id: input.id },
            data: {
              name: input.name,
              activeRetentionDuration: input.activeRetentionDuration,
              activeRetentionMonths: input.activeRetentionMonths,
              activeRetentionDays: input.activeRetentionDays,
              inactiveRetentionDuration: input.inactiveRetentionDuration,
              inactiveRetentionMonths: input.inactiveRetentionMonths,
              inactiveRetentionDays: input.inactiveRetentionDays,
              dispositionAction: input.dispositionAction,
            },
          });
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution =
            ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Only global admins can manage Records Series.',
            });
          }

          const series = await ctx.prisma.recordsSeries.findUnique({
            where: { id: input.id },
            include: { _count: { select: { documentTypes: true } } },
          });

          if (!series) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Series not found',
            });
          }

          if (series._count.documentTypes > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'Cannot delete a Records Series that contains Document Types.',
            });
          }

          return ctx.prisma.recordsSeries.delete({
            where: { id: input.id },
          });
        }),
    });
  }
}
