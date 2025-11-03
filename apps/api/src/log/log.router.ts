// apps/api/src/log/log.router.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc/trpc';
import { User, Organization } from '@prisma/client';

type MockLog = {
  id: string;
  user: User;
  action: string;
  organization: Organization;
  userRole: string;
  createdAt: Date;
};

const mockLogs: MockLog[] = Array.from({ length: 50 }, (_, i) => ({
  id: `log-${i}`,
  user: {
    id: `user-${i}`,
    email: `user${i}@example.com`,
    name: `User ${i}`,
    organizationId: `org-${i % 3}`,
    imageUrl: null,
  },
  action: `Action ${i}`,
  organization: {
    id: `org-${i % 3}`,
    name: `Organization ${i % 3}`,
    acronym: `ORG${i % 3}`,
  },
  userRole: 'Admin',
  createdAt: new Date(),
}));

@Injectable()
export class LogRouter {
  createRouter() {
    return router({
      getLogs: publicProcedure
        .input(
          z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
          }),
        )
        .query(async ({ input }) => {
          const { page, limit } = input;
          const start = (page - 1) * limit;
          const end = start + limit;
          const logs = mockLogs.slice(start, end);
          const totalPages = Math.ceil(mockLogs.length / limit);
          return {
            logs,
            totalPages,
          };
        }),
    });
  }
}
