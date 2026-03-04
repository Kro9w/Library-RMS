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
          }),
        )
        .query(async ({ ctx, input }) => {
          const { page, limit } = input;
          const institutionId = ctx.dbUser.institutionId as string;
          const [logs, totalLogs] = await Promise.all([
            ctx.prisma.log.findMany({
              where: { institutionId: institutionId },
              orderBy: { createdAt: 'desc' },
              take: limit,
              skip: (page - 1) * limit,
              include: {
                user: true,
                institution: true,
              },
            }),
            ctx.prisma.log.count({
              where: { institutionId: institutionId },
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
