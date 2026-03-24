import { AccessControlService } from './access-control.service';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

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
    documentAccess: { create: jest.fn(), createMany: jest.fn() },
    document: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
        AccessControlService,
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

  describe('getById', () => {
    it('should fetch document with nested location data', async () => {
      const trpcRouter = router.createRouter();
      const dbUser = {
        id: 'user-1',
        institutionId: 'org-1',
        roles: [{ canManageDocuments: true, name: 'Admin' }],
      };

      // Mock user context
      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);

      const caller = trpcRouter.createCaller({
        user: { id: 'user-1' },
        prisma: mockPrismaService as any,
      });

      const mockDoc = {
        id: 'doc-1',
        title: 'Test Doc',
        createdAt: new Date(),
        activeRetentionSnapshot: null,
        inactiveRetentionSnapshot: null,
        dispositionStatus: null,
        versions: [
          {
            versionNumber: 1,
            fileType: 'application/pdf',
            s3Key: 'test-key',
            s3Bucket: 'test-bucket',
          },
        ],
        uploadedBy: {
          firstName: 'John',
          lastName: 'Doe',
          department: {
            name: 'HR',
            campus: {
              name: 'Main Campus',
            },
          },
        },
      };

      mockPrismaService.document.findFirst.mockResolvedValue(mockDoc);

      const result = await caller.getById({ id: 'doc-1' });

      expect(mockPrismaService.document.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'doc-1',
            institutionId: 'org-1',
            AND: [
              {
                documentAccesses: {
                  some: {
                    OR: [
                      { userId: 'user-1' },
                      { institutionId: 'org-1' },
                      { roleId: { in: [undefined] } },
                    ],
                  },
                },
              },
            ],
          },
          select: expect.objectContaining({
            uploadedBy: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          }),
        }),
      );

      expect(result).toMatchObject({
        title: 'Test Doc',
        uploadedBy: {
          department: {
            name: 'HR',
            campus: {
              name: 'Main Campus',
            },
          },
        },
      });
    });
  });
});
