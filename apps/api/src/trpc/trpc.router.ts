// apps/api/src/trpc/trpc.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { authedProcedure, publicProcedure, router } from './trpc';
import { DocumentsRouter } from '../documents/documents.router';
import { UserRouter } from '../user/user.router';
// 1. ADD 'inferRouterInputs'
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly documentsRouter: DocumentsRouter,
    private readonly userRouter: UserRouter,
  ) {}

  get appRouter() {
    return router({
      // ... (greeting, getDashboardStats, etc.) ...
      greeting: publicProcedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => {
          return `Hello, ${input.name}!`;
        }),

      getDashboardStats: authedProcedure.query(async ({ ctx }) => {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
        const orgId = ctx.dbUser.organizationId as string;

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
              uploadedBy: { select: { name: true } },
            },
          }),
          ctx.prisma.user.count({ where: { organizationId: orgId } }),
          ctx.prisma.document.findMany({
            where: { organizationId: orgId },
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
            uploadedBy: f.uploadedBy.name,
          })),
          totalUsers,
          docsByType: [], // Your schema no longer has a 'type' field
          topTags,
        };
      }),

      documents: this.documentsRouter.router,
      user: this.userRouter.router,
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;
// 2. ADD THIS EXPORT
export type AppRouterInputs = inferRouterInputs<AppRouter>;