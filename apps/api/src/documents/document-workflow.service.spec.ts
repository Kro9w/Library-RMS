import { Test, TestingModule } from '@nestjs/testing';
import { DocumentWorkflowService } from './document-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { AccessControlService } from './access-control.service';

describe('DocumentWorkflowService - createNotification', () => {
  let service: DocumentWorkflowService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      notification: {
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentWorkflowService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LogService, useValue: {} },
        { provide: AccessControlService, useValue: {} },
      ],
    }).compile();

    service = module.get<DocumentWorkflowService>(DocumentWorkflowService);
  });

  it('should create a single notification when a single string ID is passed', async () => {
    await service.createNotification(
      'user-1',
      'Test Title',
      'Test Message',
      'doc-1',
    );

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          title: 'Test Title',
          message: 'Test Message',
          documentId: 'doc-1',
        },
      ],
    });
  });

  it('should create multiple notifications when an array of IDs is passed', async () => {
    await service.createNotification(
      ['user-1', 'user-2'],
      'Group Title',
      'Group Message',
      'doc-2',
    );

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          title: 'Group Title',
          message: 'Group Message',
          documentId: 'doc-2',
        },
        {
          userId: 'user-2',
          title: 'Group Title',
          message: 'Group Message',
          documentId: 'doc-2',
        },
      ],
    });
  });

  it('should not call database if an empty array is passed', async () => {
    await service.createNotification(
      [],
      'No one',
      'Should not be sent',
      'doc-3',
    );

    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });
});
