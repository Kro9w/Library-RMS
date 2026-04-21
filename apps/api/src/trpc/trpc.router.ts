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
            seriesStats: [],
            overallStats: {
              docsByType: [],
              docsByRetention: [],
            },
          };
        }

        const aclWhere = this.accessControlService.generateAclWhereClause(
          ctx.dbUser,
        );

        const documentWhere = {
          AND: [aclWhere],
        };

        const [
          totalDocuments,
          recentUploadsCount,
          recentFiles,
          totalUsers,
          docsRaw,
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
          ctx.prisma.document.findMany({
            where: documentWhere,
            select: {
              documentTypeId: true,
              createdAt: true,
              lifecycle: {
                select: {
                  activeRetentionSnapshot: true,
                  activeRetentionMonthsSnapshot: true,
                  activeRetentionDaysSnapshot: true,
                  inactiveRetentionSnapshot: true,
                  inactiveRetentionMonthsSnapshot: true,
                  inactiveRetentionDaysSnapshot: true,
                  dispositionStatus: true,
                  isUnderLegalHold: true,
                },
              },
            },
          }),
        ]);

        const documentTypeIds = Array.from(
          new Set(
            docsRaw
              .map((d) => d.documentTypeId)
              .filter((id): id is string => id !== null),
          ),
        );

        const documentTypes = await ctx.prisma.documentType.findMany({
          where: {
            id: { in: documentTypeIds },
          },
          include: {
            recordsSeries: true,
          },
        });

        const seriesMap = new Map<
          string,
          {
            id: string;
            name: string;
            totalDocs: number;
            docsByTypeMap: Map<
              string,
              { name: string; value: number; color: string }
            >;
            retentionMap: Map<string, number>;
          }
        >();

        const overallDocsByTypeMap = new Map<
          string,
          { name: string; value: number; color: string }
        >();
        const overallRetentionMap = new Map<string, number>();

        const now = new Date();

        for (const doc of docsRaw) {
          const docType = documentTypes.find(
            (t) => t.id === doc.documentTypeId,
          );
          const typeId = docType?.id || 'uncategorized';
          const typeName = docType?.name || 'Uncategorized';
          let typeColor = docType?.color || '#AAB8C2';
          if (typeColor && !typeColor.startsWith('#')) {
            typeColor = `#${typeColor}`;
          }

          const seriesId = docType?.recordsSeriesId || 'unassigned';
          const seriesName = docType?.recordsSeries?.name || 'Unassigned';

          // Inline lifecycle computation to avoid service injection overhead
          let lifecycleStatus = 'Active';
          if (doc.lifecycle) {
            if (doc.lifecycle.isUnderLegalHold) {
              lifecycleStatus = 'Legal Hold';
            } else if (doc.lifecycle.dispositionStatus === 'DESTROYED') {
              lifecycleStatus = 'Destroyed';
            } else if (doc.lifecycle.dispositionStatus === 'ARCHIVED') {
              lifecycleStatus = 'Archived';
            } else {
              const created = new Date(doc.createdAt);
              const activeUntil = new Date(created);
              activeUntil.setFullYear(
                activeUntil.getFullYear() +
                  (doc.lifecycle.activeRetentionSnapshot ?? 0),
              );
              activeUntil.setMonth(
                activeUntil.getMonth() +
                  (doc.lifecycle.activeRetentionMonthsSnapshot ?? 0),
              );
              activeUntil.setDate(
                activeUntil.getDate() +
                  (doc.lifecycle.activeRetentionDaysSnapshot ?? 0),
              );

              if (now < activeUntil) {
                lifecycleStatus = 'Active';
              } else {
                const inactiveUntil = new Date(activeUntil);
                inactiveUntil.setFullYear(
                  inactiveUntil.getFullYear() +
                    (doc.lifecycle.inactiveRetentionSnapshot ?? 0),
                );
                inactiveUntil.setMonth(
                  inactiveUntil.getMonth() +
                    (doc.lifecycle.inactiveRetentionMonthsSnapshot ?? 0),
                );
                inactiveUntil.setDate(
                  inactiveUntil.getDate() +
                    (doc.lifecycle.inactiveRetentionDaysSnapshot ?? 0),
                );

                if (now < inactiveUntil) {
                  lifecycleStatus = 'Inactive';
                } else {
                  lifecycleStatus = 'Ready for Disposition';
                }
              }
            }
          }

          if (
            lifecycleStatus === 'Archived' ||
            lifecycleStatus === 'Destroyed' ||
            lifecycleStatus === 'Legal Hold'
          ) {
            // Exclude from retention pie chart
          } else {
            overallRetentionMap.set(
              lifecycleStatus,
              (overallRetentionMap.get(lifecycleStatus) || 0) + 1,
            );
          }

          if (!overallDocsByTypeMap.has(typeId)) {
            overallDocsByTypeMap.set(typeId, {
              name: typeName,
              value: 0,
              color: typeColor,
            });
          }
          overallDocsByTypeMap.get(typeId)!.value += 1;

          if (!seriesMap.has(seriesId)) {
            seriesMap.set(seriesId, {
              id: seriesId,
              name: seriesName,
              totalDocs: 0,
              docsByTypeMap: new Map(),
              retentionMap: new Map(),
            });
          }

          const seriesData = seriesMap.get(seriesId)!;
          seriesData.totalDocs += 1;

          if (!seriesData.docsByTypeMap.has(typeId)) {
            seriesData.docsByTypeMap.set(typeId, {
              name: typeName,
              value: 0,
              color: typeColor,
            });
          }
          seriesData.docsByTypeMap.get(typeId)!.value += 1;

          if (
            lifecycleStatus !== 'Archived' &&
            lifecycleStatus !== 'Destroyed' &&
            lifecycleStatus !== 'Legal Hold'
          ) {
            seriesData.retentionMap.set(
              lifecycleStatus,
              (seriesData.retentionMap.get(lifecycleStatus) || 0) + 1,
            );
          }
        }

        const seriesStats = Array.from(seriesMap.values()).map((series) => ({
          id: series.id,
          name: series.name,
          totalDocs: series.totalDocs,
          docsByType: Array.from(series.docsByTypeMap.values()),
          docsByRetention: Array.from(series.retentionMap.entries()).map(
            ([name, value]) => ({ name, value }),
          ),
        }));

        const overallStats = {
          docsByType: Array.from(overallDocsByTypeMap.values()),
          docsByRetention: Array.from(overallRetentionMap.entries()).map(
            ([name, value]) => ({ name, value }),
          ),
        };

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
          seriesStats,
          overallStats,
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
