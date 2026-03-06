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

import { Test, TestingModule } from '@nestjs/testing';
import { TrpcRouter } from './trpc.router';
import { DocumentsRouter } from '../documents/documents.router';
import { UserRouter } from '../user/user.router';
import { RolesRouter } from '../roles/roles.router';
import { DocumentTypesRouter } from '../document-types/document-types.router';
import { LogRouter } from '../log/log.router';
import { WordDocumentRouter } from '../word-document/word-document.router';
import { NotificationsRouter } from '../notifications/notifications.router';

describe('TrpcRouter', () => {
  let trpcRouter: TrpcRouter;

  const mockRouter = {
    createRouter: jest.fn().mockReturnValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrpcRouter,
        { provide: DocumentsRouter, useValue: mockRouter },
        { provide: UserRouter, useValue: mockRouter },
        { provide: RolesRouter, useValue: mockRouter },
        { provide: DocumentTypesRouter, useValue: mockRouter },
        { provide: LogRouter, useValue: mockRouter },
        { provide: WordDocumentRouter, useValue: mockRouter },
        { provide: NotificationsRouter, useValue: mockRouter },
      ],
    }).compile();

    trpcRouter = module.get<TrpcRouter>(TrpcRouter);
  });

  describe('getDashboardStats', () => {
    it('should return 0s if departmentId, institutionId, or campusId is not present', async () => {
      const mockPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            institutionId: 'org-1',
            departmentId: null,
            campusId: 'campus-1',
            roles: [],
          }),
        },
      };

      const appRouter = trpcRouter.appRouter;
      const caller = appRouter.createCaller({
        user: { id: 'user-1' } as any,
        dbUser: {
          id: 'user-1',
          institutionId: 'org-1',
          departmentId: null,
          campusId: 'campus-1',
        } as any,
        prisma: mockPrisma as any,
      });

      const result = await caller.getDashboardStats();

      expect(result).toEqual({
        totalDocuments: 0,
        recentUploadsCount: 0,
        recentFiles: [],
        totalUsers: 0,
        docsByType: [],
        docsByStatus: [],
      });
    });

    it('should query prisma with OR condition for documents and strictly departmentId for users', async () => {
      const mockPrisma = {
        document: {
          groupBy: jest.fn().mockImplementation(({ by }) => {
            if (by[0] === 'documentTypeId') {
              return Promise.resolve([
                { documentTypeId: 'type-1', _count: { documentTypeId: 2 } },
              ]);
            }
            if (by[0] === 'status') {
              return Promise.resolve([
                { status: 'approved', _count: { status: 3 } },
              ]);
            }
            return Promise.resolve([]);
          }),
          count: jest.fn().mockResolvedValue(10),
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'doc-1',
              title: 'Doc 1',
              uploadedBy: {
                firstName: 'John',
                middleName: null,
                lastName: 'Doe',
              },
            },
          ]),
        },
        user: {
          count: jest.fn().mockResolvedValue(5),
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            institutionId: 'org-1',
            departmentId: 'dept-1',
            campusId: 'campus-1',
            roles: [],
          }),
        },
        documentType: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'type-1', name: 'Invoice', color: '#FF0000' },
            ]),
        },
        $queryRaw: jest.fn().mockResolvedValue([{ name: 'Tag 1', count: 3n }]),
      };

      const appRouter = trpcRouter.appRouter;
      const caller = appRouter.createCaller({
        user: { id: 'user-1' } as any,
        dbUser: {
          id: 'user-1',
          institutionId: 'org-1',
          departmentId: 'dept-1',
          campusId: 'campus-1',
        } as any,
        prisma: mockPrisma as any,
      });

      const result = await caller.getDashboardStats();

      const expectedDocumentWhere = {
        OR: [
          { departmentId: 'dept-1' },
          { classification: 'INSTITUTIONAL', institutionId: 'org-1' },
          { classification: 'CAMPUS', campusId: 'campus-1' },
        ],
      };

      expect(mockPrisma.document.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expectedDocumentWhere,
        }),
      );

      expect(mockPrisma.document.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining(expectedDocumentWhere),
        }),
      );

      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expectedDocumentWhere,
        }),
      );

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-1' },
        }),
      );

      // Verify the formatted results
      expect(result.totalDocuments).toBe(10);
      expect(result.totalUsers).toBe(5);
      expect(result.docsByType).toEqual([
        { name: 'Invoice', value: 2, color: '#FF0000' },
      ]);
      expect(result.docsByStatus).toEqual([{ name: 'approved', value: 3 }]);
      expect(result.recentFiles).toEqual([
        { id: 'doc-1', title: 'Doc 1', uploadedBy: 'John Doe' },
      ]);
    });
  });
});
