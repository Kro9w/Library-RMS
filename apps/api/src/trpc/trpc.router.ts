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
import { NotificationsRouter } from '../notifications/notifications.router';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly documentsRouter: DocumentsRouter,
    private readonly userRouter: UserRouter,
    private readonly documentTypesRouter: DocumentTypesRouter,
    private readonly logRouter: LogRouter,
    private readonly rolesRouter: RolesRouter,
    private readonly wordDocumentRouter: WordDocumentRouter,
    private readonly notificationsRouter: NotificationsRouter,
  ) {}

  get appRouter() {
    const formatFileType = (fileType: string | null | undefined): string => {
      if (!fileType) return 'Other';
      if (fileType.includes('pdf')) return 'PDF';
      if (fileType.includes('word')) return 'DOCX';
      if (fileType.includes('excel') || fileType.includes('spreadsheet'))
        return 'XLSX';
      if (fileType.includes('image')) return 'Image';
      if (fileType.includes('text')) return 'Text';
      return 'Other';
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
        const departmentId = ctx.dbUser.departmentId;
        const organizationId = ctx.dbUser.organizationId;
        const campusId = ctx.dbUser.campusId;

        // Basic check if user belongs to a department
        if (!departmentId || !organizationId || !campusId) {
          return {
            totalDocuments: 0,
            recentUploadsCount: 0,
            recentFiles: [],
            totalUsers: 0,
            docsByType: [],
            topTags: [],
          };
        }

        const documentWhere = {
          OR: [
            { departmentId },
            { classification: 'INSTITUTIONAL' as const, organizationId },
            { classification: 'CAMPUS' as const, campusId },
          ],
        };

        const docsByTypeQuery = ctx.prisma.document.groupBy({
          by: ['fileType'],
          _count: {
            fileType: true,
          },
          where: documentWhere,
        });

        const [
          totalDocuments,
          recentUploadsCount,
          recentFiles,
          totalUsers,
          topTagsRaw,
          docsByTypeRaw,
        ] = await Promise.all([
          ctx.prisma.document.count({ where: documentWhere }),
          ctx.prisma.document.count({
            where: {
              ...documentWhere,
              createdAt: { gte: twentyFourHoursAgo },
            },
          }),
          ctx.prisma.document.findMany({
            where: documentWhere,
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              title: true,
              uploadedBy: {
                select: { firstName: true, middleName: true, lastName: true },
              },
            },
          }),
          ctx.prisma.user.count({ where: { departmentId } }),
          ctx.prisma.$queryRaw<{ name: string; count: bigint }[]>`
            SELECT t.name, COUNT(dt."B")::int as count
            FROM "_DocumentToTag" dt
            JOIN "Document" d ON dt."A" = d.id
            JOIN "Tag" t ON dt."B" = t.id
            WHERE d."departmentId" = ${departmentId}
               OR (d."classification" = 'INSTITUTIONAL'::"Classification" AND d."organizationId" = ${organizationId})
               OR (d."classification" = 'CAMPUS'::"Classification" AND d."campusId" = ${campusId})
            GROUP BY t.name
            ORDER BY count DESC
            LIMIT 5;
          `,
          docsByTypeQuery,
        ]);

        const docsByType = docsByTypeRaw.map((group) => ({
          name: formatFileType(group.fileType),
          value: group._count.fileType,
        }));

        const topTags = topTagsRaw.map((tag) => ({
          name: tag.name,
          count: Number(tag.count),
        }));

        return {
          totalDocuments,
          recentUploadsCount,
          recentFiles: recentFiles.map((f) => {
            // Format name here: First Middle Last
            const u = f.uploadedBy;
            const nameParts = [u.firstName, u.middleName, u.lastName].filter(
              Boolean,
            );
            const formattedName = nameParts.join(' ');

            return {
              ...f,
              uploadedBy: formattedName,
            };
          }),
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
      wordDocument: this.wordDocumentRouter.createRouter(), // Updated to createRouter()
      notifications: this.notificationsRouter.createRouter(),
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;
export type AppRouterInputs = inferRouterInputs<AppRouter>;
