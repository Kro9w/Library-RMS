import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc/trpc';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsRouter {
  constructor(private readonly prisma: PrismaService) {}

  createRouter() {
    return router({
      getAll: protectedProcedure.query(async ({ ctx }) => {
        return this.prisma.notification.findMany({
          where: { userId: ctx.dbUser.id },
          orderBy: { createdAt: 'desc' },
        });
      }),

      getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
        return this.prisma.notification.count({
          where: { userId: ctx.dbUser.id, isRead: false },
        });
      }),

      markAsRead: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          return this.prisma.notification.update({
            where: { id: input.id, userId: ctx.dbUser.id },
            data: { isRead: true },
          });
        }),

      markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
        return this.prisma.notification.updateMany({
          where: { userId: ctx.dbUser.id, isRead: false },
          data: { isRead: true },
        });
      }),
    });
  }
}
