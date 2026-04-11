import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc/trpc';
import { LogService } from '../log/log.service';
import { DispositionAction } from '@prisma/client';

@Injectable()
export class DocumentTypesRouter {
  constructor(private readonly logService: LogService) {}

  createRouter() {
    return router({
      getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.prisma.documentType.findMany({
          orderBy: { name: 'asc' },
        });
      }),

      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            color: z.string().min(1),
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
              message: 'Only global admins can manage document types.',
            });
          }
          const newDocType = await ctx.prisma.documentType.create({
            data: {
              name: input.name,
              color: input.color,
              activeRetentionDuration: input.activeRetentionDuration,
              activeRetentionMonths: input.activeRetentionMonths,
              activeRetentionDays: input.activeRetentionDays,
              inactiveRetentionDuration: input.inactiveRetentionDuration,
              inactiveRetentionMonths: input.inactiveRetentionMonths,
              inactiveRetentionDays: input.inactiveRetentionDays,
              dispositionAction: input.dispositionAction,
            },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            `Created document type: ${newDocType.name}`,
            ctx.dbUser.roles.map((r) => r.name),
            undefined,
            ctx.dbUser.campusId || undefined,
            ctx.dbUser.departmentId || undefined,
          );

          return newDocType;
        }),

      update: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1),
            color: z.string().min(1),
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
              message: 'Only global admins can manage document types.',
            });
          }
          return ctx.prisma.documentType.update({
            where: { id: input.id },
            data: {
              name: input.name,
              color: input.color,
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
              message: 'Only global admins can manage document types.',
            });
          }
          const deletedDocType = await ctx.prisma.documentType.delete({
            where: { id: input.id },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            `Deleted document type: ${deletedDocType.name}`,
            ctx.dbUser.roles.map((r) => r.name),
            undefined,
            ctx.dbUser.campusId || undefined,
            ctx.dbUser.departmentId || undefined,
          );

          return deletedDocType;
        }),
    });
  }
}
