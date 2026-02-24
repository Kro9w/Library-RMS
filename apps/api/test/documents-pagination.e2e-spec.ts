/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';

// Mock env before importing router
jest.mock('../src/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:5432/mock',
    DIRECT_URL: 'postgresql://mock:5432/mock',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    SUPABASE_BUCKET_NAME: 'documents',
    NODE_ENV: 'test',
  },
}));

import { DocumentsRouter } from '../src/documents/documents.router';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { LogService } from '../src/log/log.service';

describe('DocumentsRouter Pagination', () => {
  let router: DocumentsRouter;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((promises) => Promise.all(promises)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          organizationId: 'o1',
          roles: [],
        }),
      },
      document: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsRouter,
        { provide: PrismaService, useValue: prisma },
        { provide: SupabaseService, useValue: { getAdminClient: jest.fn() } },
        { provide: LogService, useValue: { logAction: jest.fn() } },
      ],
    }).compile();

    router = module.get<DocumentsRouter>(DocumentsRouter);
  });

  it('getAll calls findMany WITH pagination defaults', async () => {
    const caller = router.createRouter().createCaller({
      user: { id: 'u1' },
      dbUser: { organizationId: 'o1', roles: [] },
      prisma,
    } as any);

    prisma.document.findMany.mockResolvedValue([
      {
        id: 'doc1',
        tags: [],
        createdAt: new Date(),
        dispositionStatus: null,
        activeRetentionSnapshot: null,
      },
    ]);
    prisma.document.count.mockResolvedValue(1);

    const result = await caller.getAll({});

    expect(prisma.document.findMany).toHaveBeenCalled();
    const args = prisma.document.findMany.mock.calls[0][0];

    expect(args).toHaveProperty('skip', 0);
    expect(args).toHaveProperty('take', 25);
    expect(args.where).toMatchObject({ organizationId: 'o1' });

    expect(result).toHaveProperty('documents');
    expect(result.totalCount).toBe(1);
  });

  it('getAll supports custom pagination', async () => {
    const caller = router.createRouter().createCaller({
      user: { id: 'u1' },
      dbUser: { organizationId: 'o1', roles: [] },
      prisma,
    } as any);

    await caller.getAll({ page: 2, perPage: 10 });

    const args = prisma.document.findMany.mock.calls[0][0];
    expect(args).toHaveProperty('skip', 10);
    expect(args).toHaveProperty('take', 10);
  });

  it('getAll uses queryRaw for ready filter', async () => {
    const caller = router.createRouter().createCaller({
      user: { id: 'u1' },
      dbUser: { organizationId: 'o1', roles: [] },
      prisma,
    } as any);

    prisma.$queryRaw.mockResolvedValue([{ id: 'doc1', full_count: 5n }]);

    prisma.document.findMany.mockResolvedValue([
      {
        id: 'doc1',
        tags: [],
        createdAt: new Date(),
        dispositionStatus: null,
        activeRetentionSnapshot: null,
      },
    ]);

    const result = await caller.getAll({ lifecycleFilter: 'ready' });

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.document.findMany).toHaveBeenCalled();

    const args = prisma.document.findMany.mock.calls[0][0];
    expect(args.where.id).toEqual({ in: ['doc1'] });

    expect(result.totalCount).toBe(5);
  });
});
