// apps/api/src/log/log.router.ts
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
            scope
          } = input;
          
          const institutionId = ctx.dbUser.institutionId as string;
          
          const hasMasterAccess = ctx.dbUser.roles.some((r) => r.canManageInstitution);
          const isCampusExecutive = ctx.dbUser.roles.some((r) => r.level === 0);

          const whereClause: any = {
            institutionId,
          };

          // Handle explicitly provided filters
          if (campusId) whereClause.campusId = campusId;
          if (departmentId) whereClause.departmentId = departmentId;
          
          // Determine base scoping boundaries if specific filters aren't provided
          // or if user wants to view a specific scope they have access to
          if (scope === 'DEPARTMENT') {
             // For department scope, always restrict to their own department
             whereClause.departmentId = ctx.dbUser.departmentId;
          } else if (scope === 'CAMPUS') {
             if (hasMasterAccess) {
                // Master can see any campus, just use campusId filter if provided
             } else if (isCampusExecutive) {
                // Executive is restricted to their own campus
                whereClause.campusId = ctx.dbUser.campusId;
             } else {
                throw new Error('Unauthorized for CAMPUS scope');
             }
          } else if (scope === 'INSTITUTION') {
             if (!hasMasterAccess) {
                throw new Error('Unauthorized for INSTITUTION scope');
             }
             // Master can see the whole institution
          } else {
             // Default behavior if scope is not explicitly provided
             if (hasMasterAccess) {
               // Master sees all
             } else if (isCampusExecutive) {
               // Exec defaults to their campus
               whereClause.campusId = ctx.dbUser.campusId;
             } else {
               // Regular user defaults to their department
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

          const [logs, totalLogs] = await Promise.all([
            ctx.prisma.log.findMany({
              where: whereClause,
              orderBy: { createdAt: 'desc' },
              take: limit,
              skip: (page - 1) * limit,
              include: {
                user: true,
                institution: true,
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
}
