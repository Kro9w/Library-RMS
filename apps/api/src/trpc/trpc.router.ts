// apps/api/src/trpc/trpc.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './trpc';
import { DocumentsRouter } from '../documents/documents.router';
import { UserRouter } from '../user/user.router';
import { RolesRouter } from '../roles/roles.router';
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';

import { DocumentTypesRouter } from '../document-types/document-types.router';
import { LogRouter } from '../log/log.router';
import { WordDocumentRouter } from '../word-document/word-document.router';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly documentsRouter: DocumentsRouter,
    private readonly userRouter: UserRouter,
    private readonly documentTypesRouter: DocumentTypesRouter,
    private readonly logRouter: LogRouter,
    private readonly rolesRouter: RolesRouter,
    private readonly wordDocumentRouter: WordDocumentRouter,
  ) {}

  get appRouter() {
    const formatFileType = (fileType: string | null | undefined): string => {
      if (!fileType) return "Other";
      if (fileType.includes("pdf")) return "PDF";
      if (fileType.includes("word")) return "DOCX";
      if (fileType.includes("excel") || fileType.includes("spreadsheet"))
        return "XLSX";
      if (fileType.includes("image")) return "Image";
      if (fileType.includes("text")) return "Text";
      return "Other";
    };

    return router({
      greeting: publicProcedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => {
          return `Hello, ${input.name}!`;
        }),

      getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
        const orgId = ctx.dbUser.organizationId as string;

        const docsByTypeQuery = ctx.prisma.document.groupBy({
          by: ["fileType"],
          _count: {
            fileType: true,
          },
          where: { organizationId: orgId },
        });

        // Refactored to match implicit relations for tags
        // Old: select: { tags: { include: { tag: true } } }
        // New: select: { tags: true } (since it's implicit)
        const [
          totalDocuments,
          recentUploadsCount,
          recentFiles,
          totalUsers,
          allDocumentTags,
          docsByTypeRaw,
        ] = await Promise.all([
          ctx.prisma.document.count({ where: { organizationId: orgId } }),
          ctx.prisma.document.count({
            where: {
              organizationId: orgId,
              createdAt: { gte: twentyFourHoursAgo },
            },
          }),
          ctx.prisma.document.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              title: true,
              uploadedBy: { select: { name: true } },
            },
          }),
          ctx.prisma.user.count({ where: { organizationId: orgId } }),
          ctx.prisma.document.findMany({
            where: { organizationId: orgId },
            select: { tags: true }, 
          }),
          docsByTypeQuery,
        ]);

        const docsByType = docsByTypeRaw.map((group) => ({
          name: formatFileType(group.fileType),
          value: group._count.fileType,
        }));

        const tagCountMap: Record<string, number> = {};
        for (const doc of allDocumentTags) {
          // doc.tags is now Tag[] directly
          for (const tag of doc.tags) {
            tagCountMap[tag.name] =
              (tagCountMap[tag.name] || 0) + 1;
          }
        }
        const topTags = Object.entries(tagCountMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        return {
          totalDocuments,
          recentUploadsCount,
          recentFiles: recentFiles.map((f) => ({
            ...f,
            uploadedBy: f.uploadedBy.name,
          })),
          totalUsers,
          docsByType: docsByType,
          topTags,
        };
      }),

      documents: this.documentsRouter.createRouter(),
      user: this.userRouter.createRouter(),
      roles: this.rolesRouter.createRouter(),
      documentTypes: this.documentTypesRouter.createRouter(),
      logs: this.logRouter.createRouter(),
      wordDocument: this.wordDocumentRouter.wordDocumentRouter,
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;
export type AppRouterInputs = inferRouterInputs<AppRouter>;
