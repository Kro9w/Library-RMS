// apps/api/src/document-types/document-types.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';

@Injectable()
export class DocumentTypesRouter {
  createRouter() {
    return router({
      // Procedure to get all document types for the current user's organization
      getAll: protectedProcedure.query(async ({ ctx }) => {
        const orgId = ctx.dbUser.organizationId as string;
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

          const userRoles = await ctx.prisma.userRole.findMany({
            where: { userId: ctx.dbUser.id },
            include: { role: true },
          });

          await ctx.prisma.log.create({
            data: {
              action: `Created document type: ${newDocType.name}`,
              userId: ctx.dbUser.id,
              organizationId: orgId,
              userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
            },
          });

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

          const userRoles = await ctx.prisma.userRole.findMany({
            where: { userId: ctx.dbUser.id },
            include: { role: true },
          });

          await ctx.prisma.log.create({
            data: {
              action: `Deleted document type: ${deletedDocType.name}`,
              userId: ctx.dbUser.id,
              organizationId: deletedDocType.organizationId,
              userRole: userRoles.map((userRole) => userRole.role.name).join(', '),
            },
          });

          return deletedDocType;
        }),
    });
  }
}
