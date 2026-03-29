// apps/api/src/document-types/document-types.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';
import { LogService } from '../log/log.service';
import { DispositionAction } from '@prisma/client';

@Injectable()
export class DocumentTypesRouter {
  constructor(private readonly logService: LogService) {}

  createRouter() {
    return router({
      // Procedure to get all document types for the current user's institution
      getAll: protectedProcedure.query(async ({ ctx }) => {
        const institutionId = ctx.dbUser.institutionId as string;
        // Basic check if user belongs to org
        if (!institutionId) return [];

        return ctx.prisma.documentType.findMany({
          where: { institutionId: institutionId },
          orderBy: { name: 'asc' },
        });
      }),

      // Procedure to create a new document type
      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            color: z.string().min(1),
            activeRetentionDuration: z.number().min(0).default(0),
            inactiveRetentionDuration: z.number().min(0).default(0),
            dispositionAction: z
              .nativeEnum(DispositionAction)
              .default(DispositionAction.ARCHIVE),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new Error('Only Institution Admins can manage document types.');
          }
          const institutionId = ctx.dbUser.institutionId as string;
          const newDocType = await ctx.prisma.documentType.create({
            data: {
              name: input.name,
              color: input.color,
              institutionId: institutionId,
              activeRetentionDuration: input.activeRetentionDuration,
              inactiveRetentionDuration: input.inactiveRetentionDuration,
              dispositionAction: input.dispositionAction,
            },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            institutionId,
            `Created document type: ${newDocType.name}`,
            ctx.dbUser.roles.map((r) => r.name),
            undefined,
            ctx.dbUser.campusId || undefined,
            ctx.dbUser.departmentId || undefined,
          );

          return newDocType;
        }),

      // Procedure to update an existing document type
      update: protectedProcedure
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1),
            color: z.string().min(1),
            activeRetentionDuration: z.number().min(0).optional(),
            inactiveRetentionDuration: z.number().min(0).optional(),
            dispositionAction: z.nativeEnum(DispositionAction).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new Error('Only Institution Admins can manage document types.');
          }
          return ctx.prisma.documentType.update({
            where: { id: input.id },
            data: {
              name: input.name,
              color: input.color,
              activeRetentionDuration: input.activeRetentionDuration,
              inactiveRetentionDuration: input.inactiveRetentionDuration,
              dispositionAction: input.dispositionAction,
            },
          });
        }),

      // Procedure to delete a document type
      delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const canManageInstitution = ctx.dbUser.roles?.some((r) => r.canManageInstitution) ?? false;
          if (!canManageInstitution) {
            throw new Error('Only Institution Admins can manage document types.');
          }
          const deletedDocType = await ctx.prisma.documentType.delete({
            where: { id: input.id },
          });

          await this.logService.logAction(
            ctx.dbUser.id,
            deletedDocType.institutionId,
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
