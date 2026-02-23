/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsRouter } from './documents.router';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LogService } from '../log/log.service';
import { TRPCError } from '@trpc/server';

// Mock environment variables to avoid validation errors
jest.mock('../env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:5432/mock',
    DIRECT_URL: 'postgresql://mock:5432/mock',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    SUPABASE_BUCKET_NAME: 'documents',
    NODE_ENV: 'test',
  },
}));

describe('DocumentsRouter - deleteTag', () => {
  let router: DocumentsRouter;
  let caller: any; // Type as needed, but 'any' simplifies for mocking

  const mockPrismaService = {
    tag: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    document: {
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
        DocumentsRouter,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    router = module.get<DocumentsRouter>(DocumentsRouter);
    jest.clearAllMocks();
  });

  const createCaller = (userOverrides: any = {}) => {
    const trpcRouter = router.createRouter();
    // Default mock user
    const dbUser = {
      id: 'user-1',
      organizationId: 'org-1',
      roles: [{ canManageDocuments: true, name: 'Admin' }],
      ...userOverrides,
    };

    // Mock user fetch for middleware
    mockPrismaService.user.findUnique.mockResolvedValue(dbUser);

    return trpcRouter.createCaller({
      user: { id: dbUser.id },
      prisma: mockPrismaService as any,
    });
  };

  it('should prevent user without permission from deleting a tag', async () => {
    caller = createCaller({
      roles: [{ canManageDocuments: false, name: 'Member' }],
    });

    await expect(caller.deleteTag('tag-1')).rejects.toThrow(
      new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to canManageDocuments.',
      }),
    );

    expect(mockPrismaService.tag.delete).not.toHaveBeenCalled();
  });

  it('should prevent deletion of global tags', async () => {
    caller = createCaller(); // Admin user

    mockPrismaService.tag.findUnique.mockResolvedValue({
      id: 'tag-global',
      isGlobal: true,
      isLocked: false,
    });

    await expect(caller.deleteTag('tag-global')).rejects.toThrow(
      new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete global or locked tags.',
      }),
    );

    expect(mockPrismaService.tag.delete).not.toHaveBeenCalled();
  });

  it('should prevent deletion of locked tags', async () => {
    caller = createCaller(); // Admin user

    mockPrismaService.tag.findUnique.mockResolvedValue({
      id: 'tag-locked',
      isGlobal: false,
      isLocked: true,
    });

    await expect(caller.deleteTag('tag-locked')).rejects.toThrow(
      new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete global or locked tags.',
      }),
    );

    expect(mockPrismaService.tag.delete).not.toHaveBeenCalled();
  });

  it('should prevent deletion if tag is used by another organization', async () => {
    caller = createCaller({ organizationId: 'org-1' }); // Admin of org-1

    mockPrismaService.tag.findUnique.mockResolvedValue({
      id: 'tag-shared',
      isGlobal: false,
      isLocked: false,
    });

    // Mock that another organization uses this tag
    mockPrismaService.document.findFirst.mockResolvedValue({
      id: 'doc-other-org',
      organizationId: 'org-2', // Different org
    });

    await expect(caller.deleteTag('tag-shared')).rejects.toThrow(
      new TRPCError({
        code: 'FORBIDDEN',
        message: 'Tag is in use by other organizations.',
      }),
    );

    expect(mockPrismaService.tag.delete).not.toHaveBeenCalled();
    // Verify we checked for usage OUTSIDE org-1
    expect(mockPrismaService.document.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { some: { id: 'tag-shared' } },
          organizationId: { not: 'org-1' },
        }),
      }),
    );
  });

  it('should allow deletion if tag is valid and only used by current organization', async () => {
    caller = createCaller({ organizationId: 'org-1' }); // Admin of org-1

    mockPrismaService.tag.findUnique.mockResolvedValue({
      id: 'tag-local',
      isGlobal: false,
      isLocked: false,
    });

    // Mock that NO other organization uses this tag
    mockPrismaService.document.findFirst.mockResolvedValue(null);

    mockPrismaService.tag.delete.mockResolvedValue({ id: 'tag-local' });

    await caller.deleteTag('tag-local');

    expect(mockPrismaService.tag.delete).toHaveBeenCalledWith({
      where: { id: 'tag-local' },
    });
  });
});
