
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsRouter } from './documents.router';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LogService } from '../log/log.service';
import { TRPCError } from '@trpc/server';

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

describe('DocumentsRouter Security', () => {
  let router: DocumentsRouter;

  const mockPrismaService = {
    document: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  };

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
  };

  const mockLogService = {
    logAction: jest.fn(),
    logActions: jest.fn(),
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

  describe('sendDocument', () => {
    it('should throw FORBIDDEN if user tries to send a document they do not own and lack permission', async () => {
      const trpcRouter = router.createRouter();
      
      const userId = 'user-1';
      const otherUserId = 'user-2';
      const docId = 'doc-1';
      const orgId = 'org-1';

      const dbUser = {
        id: userId,
        organizationId: orgId,
        roles: [{ canManageDocuments: false, name: 'Member' }],
      };

      // Recipient exists
      mockPrismaService.user.findUnique.mockImplementation((args) => {
        if (args.where.id === userId) {
          return Promise.resolve(dbUser);
        }
        if (args.where.id === 'recipient-1') {
          return Promise.resolve({
            id: 'recipient-1',
            firstName: 'John',
            lastName: 'Doe',
          });
        }
        return Promise.resolve(null);
      });

      // Document exists in org but owned by someone else
      mockPrismaService.document.findMany.mockImplementation((args) => {
        // Simulate DB filtering: if query requests a specific uploader, check against document's owner
        if (args.where.uploadedById && args.where.uploadedById !== otherUserId) {
          return [];
        }
        return [{ id: docId, organizationId: orgId, uploadedById: otherUserId, title: 'Test Doc' }];
      });
      
      // Mock update to return a document so the operation succeeds (demonstrating vulnerability)
      mockPrismaService.document.update.mockResolvedValue({ id: docId, title: 'Test Doc' });

      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const caller = trpcRouter.createCaller({
        user: { id: userId },
        dbUser: dbUser as any,
        prisma: mockPrismaService as any,
      });

      // This should fail securely, but currently it might succeed due to vulnerability
      await expect(
        caller.sendDocument({
          documentId: docId,
          recipientId: 'recipient-1',
          tagIds: [],
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      );
    });

    it('should allow user to send a document they own', async () => {
        const trpcRouter = router.createRouter();
        
        const userId = 'user-1';
        const docId = 'doc-1';
        const orgId = 'org-1';
  
        const dbUser = {
          id: userId,
          organizationId: orgId,
          roles: [{ canManageDocuments: false, name: 'Member' }],
        };
  
        mockPrismaService.user.findUnique.mockImplementation((args) => {
            if (args.where.id === userId) {
              return Promise.resolve(dbUser);
            }
            if (args.where.id === 'recipient-1') {
              return Promise.resolve({
                id: 'recipient-1',
                firstName: 'John',
                lastName: 'Doe',
              });
            }
            return Promise.resolve(null);
          });
  
        // Document owned by user
        mockPrismaService.document.findMany.mockResolvedValue([
          { id: docId, organizationId: orgId, uploadedById: userId, title: 'Test Doc' },
        ]);
        
        mockPrismaService.tag.findMany.mockResolvedValue([]);
        mockPrismaService.document.update.mockResolvedValue({ id: docId, title: 'Test Doc' });
  
        const caller = trpcRouter.createCaller({
          user: { id: userId },
          dbUser: dbUser as any,
          prisma: mockPrismaService as any,
        });
  
        await expect(
          caller.sendDocument({
            documentId: docId,
            recipientId: 'recipient-1',
            tagIds: [],
          }),
        ).resolves.not.toThrow();
      });

      it('should allow admin to send any document in organization', async () => {
        const trpcRouter = router.createRouter();
        
        const userId = 'admin-1';
        const otherUserId = 'user-2';
        const docId = 'doc-1';
        const orgId = 'org-1';
  
        const dbUser = {
          id: userId,
          organizationId: orgId,
          roles: [{ canManageDocuments: true, name: 'Admin' }],
        };
  
        mockPrismaService.user.findUnique.mockImplementation((args) => {
            if (args.where.id === userId) {
              return Promise.resolve(dbUser);
            }
            if (args.where.id === 'recipient-1') {
              return Promise.resolve({
                id: 'recipient-1',
                firstName: 'John',
                lastName: 'Doe',
              });
            }
            return Promise.resolve(null);
          });
  
        // Document owned by someone else
        mockPrismaService.document.findMany.mockResolvedValue([
          { id: docId, organizationId: orgId, uploadedById: otherUserId, title: 'Test Doc' },
        ]);
        
        mockPrismaService.tag.findMany.mockResolvedValue([]);
        mockPrismaService.document.update.mockResolvedValue({ id: docId, title: 'Test Doc' });
  
        const caller = trpcRouter.createCaller({
          user: { id: userId },
          dbUser: dbUser as any,
          prisma: mockPrismaService as any,
        });
  
        await expect(
          caller.sendDocument({
            documentId: docId,
            recipientId: 'recipient-1',
            tagIds: [],
          }),
        ).resolves.not.toThrow();
      });
  });

  describe('sendMultipleDocuments', () => {
    it('should throw FORBIDDEN if user tries to send documents they do not own', async () => {
      const trpcRouter = router.createRouter();
      
      const userId = 'user-1';
      const otherUserId = 'user-2';
      const docId1 = 'doc-1';
      const docId2 = 'doc-2';
      const orgId = 'org-1';

      const dbUser = {
        id: userId,
        organizationId: orgId,
        roles: [{ canManageDocuments: false, name: 'Member' }],
      };

      mockPrismaService.user.findUnique.mockImplementation((args) => {
        if (args.where.id === userId) {
          return Promise.resolve(dbUser);
        }
        if (args.where.id === 'recipient-1') {
          return Promise.resolve({
            id: 'recipient-1',
            firstName: 'John',
            lastName: 'Doe',
          });
        }
        return Promise.resolve(null);
      });

      // One doc owned by user, one by someone else
      mockPrismaService.document.findMany.mockImplementation((args) => {
        const docs = [
            { id: docId1, organizationId: orgId, uploadedById: userId, title: 'My Doc' },
            { id: docId2, organizationId: orgId, uploadedById: otherUserId, title: 'Other Doc' },
        ];
        
        if (args.where.uploadedById) {
             return docs.filter(d => d.uploadedById === args.where.uploadedById);
        }
        return docs;
      });

      // Mock transaction result
      mockPrismaService.$transaction.mockResolvedValue([
        { id: docId1, title: 'My Doc' },
        { id: docId2, title: 'Other Doc' },
      ]);

      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const caller = trpcRouter.createCaller({
        user: { id: userId },
        dbUser: dbUser as any,
        prisma: mockPrismaService as any,
      });

      await expect(
        caller.sendMultipleDocuments({
          documentIds: [docId1, docId2],
          recipientId: 'recipient-1',
          tagIds: [],
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      );
    });
  });
});
