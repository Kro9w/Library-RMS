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

describe('DocumentsRouter Performance', () => {
  let router: DocumentsRouter;

  const mockPrismaService = {
    document: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
  };

  const mockLogService = {
    logAction: jest.fn().mockResolvedValue(undefined),
    logActions: jest.fn().mockResolvedValue(undefined),
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

  it('should call logActions once in sendMultipleDocuments (Optimized State)', async () => {
    const trpcRouter = router.createRouter();
    const dbUser = {
      id: 'user-1',
      organizationId: 'org-1',
      roles: [{ name: 'Admin' }],
    };

    mockPrismaService.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'user-1') {
        return Promise.resolve({
          id: 'user-1',
          organizationId: 'org-1',
          roles: [{ name: 'Admin' }],
        });
      }
      if (where.id === 'recipient-1') {
        return Promise.resolve({
          id: 'recipient-1',
          organizationId: 'org-1',
          firstName: 'John',
          lastName: 'Doe',
        });
      }
      return Promise.resolve(null);
    });
    mockPrismaService.tag.findMany.mockResolvedValue([]);
    mockPrismaService.document.findMany.mockImplementation(({ where }: any) => {
      if (where.id && where.id.in) {
        return Promise.resolve(
          where.id.in.map((id: string) => ({ id, organizationId: 'org-1' })),
        );
      }
      return Promise.resolve([]);
    });
    mockPrismaService.document.update.mockImplementation(({ where }: any) => {
      return Promise.resolve({
        id: where.id,
        title: `Doc ${where.id}`,
      });
    });

    const caller = trpcRouter.createCaller({
      user: { id: 'user-1' },
      dbUser: dbUser as any,
      prisma: mockPrismaService as any,
    });

    const documentIds = ['doc-1', 'doc-2', 'doc-3'];
    await caller.sendMultipleDocuments({
      documentIds,
      recipientId: 'recipient-1',
      tagIds: ['tag-1'],
    });

    // Verify 0 calls to logAction
    expect(mockLogService.logAction).not.toHaveBeenCalled();
    // Verify 1 call to logActions
    expect(mockLogService.logActions).toHaveBeenCalledTimes(1);
    
    // Verify payload
    const callArgs = mockLogService.logActions.mock.calls[0][0];
    expect(callArgs).toHaveLength(documentIds.length);
    expect(callArgs[0]).toMatchObject({
      userId: 'user-1',
      organizationId: 'org-1',
      action: expect.stringContaining('Sent Document to John Doe'),
    });
  });
});
