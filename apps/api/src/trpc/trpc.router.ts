import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './trpc';
import { DocumentsRouter } from '../documents/documents.router';
import { UserRouter } from '../user/user.router';
import { RolesRouter } from '../roles/roles.router';
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';

import { DocumentTypesRouter } from '../document-types/document-types.router';
import { LogRouter } from '../log/log.router';
import { NotificationsRouter } from '../notifications/notifications.router';
import { AccessControlService } from '../documents/access-control.service';
import { ArchivesRouter } from '../archives/archives.router';
import { RecordsSeriesRouter } from '../records-series/records-series.router';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly documentsRouter: DocumentsRouter,
    private readonly userRouter: UserRouter,
    private readonly documentTypesRouter: DocumentTypesRouter,
    private readonly logRouter: LogRouter,
    private readonly rolesRouter: RolesRouter,
    private readonly notificationsRouter: NotificationsRouter,
    private readonly accessControlService: AccessControlService,
    private readonly archivesRouter: ArchivesRouter,
    private readonly recordsSeriesRouter: RecordsSeriesRouter,
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
        const departmentId = ctx.dbUser.departmentId;
        const campusId = ctx.dbUser.campusId;

        if (!departmentId || !campusId) {
          return {
            totalDocuments: 0,
            recentUploadsCount: 0,
            recentFiles: [],
            totalUsers: 0,
            docsByType: [],
            docsByStatus: [],
          };
        }

        const aclWhere = this.accessControlService.generateAclWhereClause(
          ctx.dbUser,
        );

        const documentWhere = {
          AND: [aclWhere],
        };

        const docsByTypeQuery = ctx.prisma.document.groupBy({
          by: ['documentTypeId'],
          _count: {
            documentTypeId: true,
          },
          where: documentWhere,
        });

        const docsByStatusQuery = ctx.prisma.documentWorkflow.groupBy({
          by: ['status'],
          _count: {
            status: true,
          },
          where: { document: documentWhere },
        });

        const [
          totalDocuments,
          recentUploadsCount,
          recentFiles,
          totalUsers,
          docsByStatusRaw,
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
          docsByStatusQuery,
          docsByTypeQuery,
        ]);

        const documentTypeIds = docsByTypeRaw
          .map((group) => group.documentTypeId)
          .filter((id): id is string => id !== null);

        const documentTypes = await ctx.prisma.documentType.findMany({
          where: {
            id: { in: documentTypeIds },
          },
        });

        const docsByType = docsByTypeRaw.map((group) => {
          const docType = documentTypes.find(
            (t) => t.id === group.documentTypeId,
          );
          let color = docType?.color || '#AAB8C2';
          if (color && !color.startsWith('#')) {
            color = `#${color}`;
          }
          return {
            name: docType?.name || 'Uncategorized',
            value: group._count.documentTypeId,
            color,
          };
        });

        const docsByStatus = docsByStatusRaw.map((group) => ({
          name: group.status || 'Uncategorized',
          value: group._count.status,
        }));

        return {
          totalDocuments,
          recentUploadsCount,
          recentFiles: recentFiles.map((f) => {
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
          docsByType,
          docsByStatus,
        };
      }),

      documents: this.documentsRouter.createRouter(),
      user: this.userRouter.createRouter(),
      roles: this.rolesRouter.createRouter(),
      documentTypes: this.documentTypesRouter.createRouter(),
      recordsSeries: this.recordsSeriesRouter.createRouter(),
      logs: this.logRouter.createRouter(),
      notifications: this.notificationsRouter.createRouter(),
      archives: this.archivesRouter.createRouter(),
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;
export type AppRouterInputs = inferRouterInputs<AppRouter>;
