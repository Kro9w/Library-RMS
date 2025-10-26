// apps/api/src/trpc/trpc.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './trpc';
import { DocumentsRouter } from '../documents/documents.router';
import { UserRouter } from '../user/user.router';
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly documentsRouter: DocumentsRouter,
    private readonly userRouter: UserRouter,
  ) {}

  get appRouter() {
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

        // This query will now work because the schema is correct
        const [
          totalDocuments,
          recentUploadsCount,
          recentFiles,
          totalUsers,
          allDocumentTags,
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
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              title: true,
              // Switched back to 'uploadedBy' and 'name'
              uploadedBy: { select: { name: true } },
            },
          }),
          ctx.prisma.user.count({ where: { organizationId: orgId } }),
          ctx.prisma.document.findMany({
            where: { organizationId: orgId },
            // This 'tags' query will now work
            select: { tags: { include: { tag: true } } },
          }),
        ]);

        const tagCountMap: Record<string, number> = {};
        for (const doc of allDocumentTags) {
          for (const docTag of doc.tags) {
            tagCountMap[docTag.tag.name] =
              (tagCountMap[docTag.tag.name] || 0) + 1;
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
            // Switched back to 'uploadedBy' and 'name'
            uploadedBy: f.uploadedBy.name,
          })),
          totalUsers,
          docsByType: [],
          topTags,
        };
      }),

      documents: this.documentsRouter.createRouter(),
      user: this.userRouter.createRouter(),
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;
export type AppRouterInputs = inferRouterInputs<AppRouter>;