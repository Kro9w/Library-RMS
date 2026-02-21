/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsRouter } from './documents.router';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LogService } from '../log/log.service';

// Mock environment variables to avoid validation errors
jest.mock('../env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:5432/mock',
    DIRECT_URL: 'postgresql://mock:5432/mock',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    NODE_ENV: 'test',
  },
}));

describe('DocumentsRouter', () => {
  let router: DocumentsRouter;

  const mockPrismaService = {
    document: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
  };

  const mockLogService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsRouter,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    router = module.get<DocumentsRouter>(DocumentsRouter);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(router).toBeDefined();
  });

  describe('getAllDocs', () => {
    it('should filter documents by organization even if user has canManageDocuments permission', async () => {
      const trpcRouter = router.createRouter();
      const dbUser = {
        id: 'user-1',
        organizationId: 'org-1',
        roles: [{ canManageDocuments: true, name: 'Admin' }],
      };

      // Mock the user fetch in the middleware
      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);

      const caller = trpcRouter.createCaller({
        user: { id: 'user-1' },
        prisma: mockPrismaService as any,
      });

      mockPrismaService.document.findMany.mockResolvedValue([]);

      await caller.getAllDocs();

      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should filter documents by organization if user does NOT have canManageDocuments permission', async () => {
      const trpcRouter = router.createRouter();
      const dbUser = {
        id: 'user-2',
        organizationId: 'org-1',
        roles: [{ canManageDocuments: false, name: 'Member' }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);

      const caller = trpcRouter.createCaller({
        user: { id: 'user-2' },
        prisma: mockPrismaService as any,
      });

      mockPrismaService.document.findMany.mockResolvedValue([]);

      await caller.getAllDocs();

      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should return empty array if user has canManageDocuments permission but no organization', async () => {
      const trpcRouter = router.createRouter();
      const dbUser = {
        id: 'user-3',
        organizationId: null,
        roles: [{ canManageDocuments: true, name: 'Admin' }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);

      const caller = trpcRouter.createCaller({
        user: { id: 'user-3' },
        prisma: mockPrismaService as any,
      });

      mockPrismaService.document.findMany.mockResolvedValue([]);

      const result = await caller.getAllDocs();

      expect(result).toEqual([]);
      expect(mockPrismaService.document.findMany).not.toHaveBeenCalled();
    });
  });
});
