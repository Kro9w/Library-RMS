import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';

@Injectable()
export class LogRouter {
  createRouter() {
    return router({
      getLogs: protectedProcedure
        .input(
          z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
            campusId: z.string().optional(),
            departmentId: z.string().optional(),
            userId: z.string().optional(),
            actionQuery: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            scope: z.enum(['INSTITUTION', 'CAMPUS', 'DEPARTMENT']).optional(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const {
            page,
            limit,
            campusId,
            departmentId,
            userId,
            actionQuery,
            startDate,
            endDate,
            scope,
          } = input;

          const hasMasterAccess = ctx.dbUser.roles.some(
            (r) => r.canManageInstitution,
          );
          const isCampusExecutive = ctx.dbUser.roles.some((r) => r.level === 0);

          const whereClause: any = this._buildWhereClause({
            ctx,
            hasMasterAccess,
            isCampusExecutive,
            campusId,
            departmentId,
            userId,
            actionQuery,
            startDate,
            endDate,
            scope,
          });

          const [logs, totalLogs] = await Promise.all([
            ctx.prisma.log.findMany({
              where: whereClause,
              orderBy: { createdAt: 'desc' },
              take: limit,
              skip: (page - 1) * limit,
              include: {
                user: true,
                campus: true,
                department: true,
              },
            }),
            ctx.prisma.log.count({
              where: whereClause,
            }),
          ]);

          return {
            logs,
            totalPages: Math.ceil(totalLogs / limit),
          };
        }),
    });
  }

  private _buildWhereClause({
    ctx,
    hasMasterAccess,
    isCampusExecutive,
    campusId,
    departmentId,
    userId,
    actionQuery,
    startDate,
    endDate,
    scope,
  }: any): any {
    const whereClause: any = {};

    if (campusId) whereClause.campusId = campusId;
    if (departmentId) whereClause.departmentId = departmentId;

    if (scope === 'DEPARTMENT') {
      whereClause.departmentId = ctx.dbUser.departmentId;
    } else if (scope === 'CAMPUS') {
      if (hasMasterAccess) {
        // Intentionally empty: uses campusId if provided
      } else if (isCampusExecutive) {
        whereClause.campusId = ctx.dbUser.campusId;
      } else {
        throw new Error('Unauthorized for CAMPUS scope');
      }
    } else if (scope === 'INSTITUTION') {
      if (!hasMasterAccess) {
        throw new Error('Unauthorized for INSTITUTION scope');
      }
    } else {
      if (hasMasterAccess) {
        // Intentionally empty: sees all
      } else if (isCampusExecutive) {
        whereClause.campusId = ctx.dbUser.campusId;
      } else {
        whereClause.departmentId = ctx.dbUser.departmentId;
      }
    }

    if (userId) whereClause.userId = userId;
    if (actionQuery) {
      whereClause.action = { contains: actionQuery, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    return whereClause;
  }
}
