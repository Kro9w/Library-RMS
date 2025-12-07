// apps/api/src/document-types/document-types.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';
import { LogService } from '../log/log.service';

@Injectable()
export class DocumentTypesRouter {
  constructor(private readonly logService: LogService) {}

  createRouter() {
    return router({
      // Procedure to get all document types for the current user's organization
      getAll: protectedProcedure.query(async ({ ctx }) => {
        const orgId = ctx.dbUser.organizationId as string;
        // Basic check if user belongs to org
        if (!orgId) return [];

        return ctx.prisma.documentType.findMany({
          where: { organizationId: orgId },
          orderBy: { name: 'asc' },
        });
      }),

      // Procedure to create a new document type
      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1),
            color: z.string().min(1),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const orgId = ctx.dbUser.organizationId as string;
          const newDocType = await ctx.prisma.documentType.create({
            data: {
              name: input.name,
              color: input.color,
              organizationId: orgId,
            },
          });

          await this.logService.logAction(
              ctx.dbUser.id,
              orgId,
              `Created document type: ${newDocType.name}`,
              ctx.dbUser.roles.map(r => r.name)
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
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return ctx.prisma.documentType.update({
            where: { id: input.id },
            data: {
              name: input.name,
              color: input.color,
            },
          });
        }),

      // Procedure to delete a document type
      delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const deletedDocType = await ctx.prisma.documentType.delete({
            where: { id: input.id },
          });

          await this.logService.logAction(
              ctx.dbUser.id,
              deletedDocType.organizationId,
              `Deleted document type: ${deletedDocType.name}`,
              ctx.dbUser.roles.map(r => r.name)
          );

          return deletedDocType;
        }),
    });
  }
}
