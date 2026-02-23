
import { Test, TestingModule } from '@nestjs/testing';
import { UserRouter } from './user.router';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { TRPCError } from '@trpc/server';
import { Context, protectedProcedure } from '../trpc/trpc';
import * as trpcExpress from '@trpc/server/adapters/express';

// Mock environment variables
jest.mock('../env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:5432/mock',
    DIRECT_URL: 'postgresql://mock:5432/mock',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    NODE_ENV: 'test',
  },
}));

describe('UserRouter Security', () => {
  let router: UserRouter;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockLogService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRouter,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    router = module.get<UserRouter>(UserRouter);
    jest.clearAllMocks();
  });

  describe('getOrgHierarchy', () => {
    it('should filter documents when user lacks canManageDocuments permission', async () => {
      const trpcRouter = router.createRouter();
      const dbUser = {
        id: 'user-1',
        organizationId: 'org-1',
        roles: [{ name: 'User', canManageDocuments: false }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });

      const caller = trpcRouter.createCaller({
        user: { id: 'user-1' },
        dbUser: dbUser as any,
        prisma: mockPrismaService as any,
      });

      await caller.getOrgHierarchy();

      const callArgs = mockPrismaService.organization.findUnique.mock.calls[0][0];
      const documentsInclude = callArgs.include.campuses.include.departments.include.users.include.documents;
      
      // Without fix, this expects undefined (no filter), but we want to assert that it SHOULD filter
      // If we assert it fails without fix, we check for presence of `where` clause.
      
      // Currently, documentsInclude.where is likely undefined.
      // We expect it to be filtered by uploadedById: 'user-1'
      expect(documentsInclude.where).toEqual({ uploadedById: 'user-1' });
    });

    it('should NOT filter documents when user HAS canManageDocuments permission', async () => {
        const trpcRouter = router.createRouter();
        const dbUser = {
          id: 'admin-1',
          organizationId: 'org-1',
          roles: [{ name: 'Admin', canManageDocuments: true }],
        };

        mockPrismaService.user.findUnique.mockResolvedValue(dbUser);
        mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-1' });

        const caller = trpcRouter.createCaller({
          user: { id: 'admin-1' },
          dbUser: dbUser as any,
          prisma: mockPrismaService as any,
        });
  
        await caller.getOrgHierarchy();
  
        const callArgs = mockPrismaService.organization.findUnique.mock.calls[0][0];
        const documentsInclude = callArgs.include.campuses.include.departments.include.users.include.documents;
        
        // Should be undefined or explicitly allow all?
        // Usually undefined means no filter (all documents).
        expect(documentsInclude.where).toBeUndefined();
      });
  });
});
