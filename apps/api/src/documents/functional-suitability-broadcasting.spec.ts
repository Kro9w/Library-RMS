import { Test, TestingModule } from '@nestjs/testing';
import { DocumentWorkflowService } from './document-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { AccessControlService } from './access-control.service';
import { TRPCError } from '@trpc/server';

describe('Functional Suitability: Document Broadcasting Routing', () => {
  let service: DocumentWorkflowService;
  let prismaMock: any;
  let accessControlMock: any;
  let logMock: any;

  beforeEach(async () => {
    prismaMock = {
      document: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      documentWorkflow: {
        findUnique: jest.fn(),
      },
      documentAccess: {
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      notification: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(prismaMock);
      }),
    };

    accessControlMock = {
      checkPermission: jest.fn().mockReturnValue(true),
      requirePermission: jest.fn(),
    };

    logMock = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentWorkflowService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LogService, useValue: logMock },
        { provide: AccessControlService, useValue: accessControlMock },
      ],
    }).compile();

    service = module.get<DocumentWorkflowService>(DocumentWorkflowService);
  });

  it('should successfully broadcast a document system-wide when isInstitutional is true', async () => {
    // 1. Arrange: Setup the mock data for an INSTITUTIONAL document broadcast
    const mockDbUser = {
      id: 'sender-id',
      firstName: 'Test',
      lastName: 'Admin',
      roles: [{ level: 0, name: 'System Admin' }],
      campusId: 'campus-1',
      departmentId: 'dept-1',
    };

    const mockCtx = {
      user: { id: 'sender-id' },
      dbUser: mockDbUser,
    };

    const input = {
      documentId: 'doc-123',
      isInstitutional: true,
      campusIds: ['dummy-campus'], // Need at least one target to bypass "No valid targets were selected" check
      departmentIds: [],
      userIds: [],
    };

    const mockDocument = {
      id: 'doc-123',
      title: 'University Memo',
      category: 'INSTITUTIONAL',
      userId: 'sender-id',
    };

    prismaMock.document.findUnique.mockResolvedValue(mockDocument);
    prismaMock.documentWorkflow.findUnique.mockResolvedValue({
      documentId: 'doc-123',
      recordStatus: 'ACTIVE',
    });
    prismaMock.documentAccess.findMany.mockResolvedValue([]);
    prismaMock.documentAccess.createMany.mockResolvedValue({ count: 1 });
    
    // Mock the key users lookup for notification targets
    const mockKeyUsers = [
      { id: 'user-2' },
      { id: 'user-3' },
    ];
    prismaMock.user.findMany.mockResolvedValue(mockKeyUsers);

    // 2. Act: Call the sendDocument function
    await service.sendDocument(mockCtx, input);

    // 3. Assert: Check that broadcasting logic routed correctly
    
    // It should check for document access
    expect(prismaMock.document.findUnique).toHaveBeenCalledWith({
      where: { id: input.documentId },
    });

    // It should determine the target is "Institution"
    expect(logMock.logAction).toHaveBeenCalledWith(
      mockCtx.user.id,
      'Sent Document to Institution',
      ['System Admin'],
      mockDocument.title,
      mockDbUser.campusId,
      mockDbUser.departmentId,
    );

    // It should query for key users to notify with an empty object {} in the OR array
    // An empty object in Prisma OR scope means "match all" for that condition.
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{}]), // Verify broadScopesWhere pushed {}
          roles: expect.any(Object)
        }),
      })
    );

    // It should send notifications to the key users system-wide
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-2',
          title: 'Document Received',
        }),
        expect.objectContaining({
          userId: 'user-3',
          title: 'Document Received',
        }),
      ]),
    });
  });
});
