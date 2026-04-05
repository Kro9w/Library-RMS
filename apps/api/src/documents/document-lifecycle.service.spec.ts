import { Test, TestingModule } from '@nestjs/testing';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DocumentLifecycleService', () => {
  let service: DocumentLifecycleService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentLifecycleService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
            document: {
              count: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DocumentLifecycleService>(DocumentLifecycleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeLifecycleStatus', () => {
    it('should return Legal Hold if isUnderLegalHold is true', () => {
      const result = service.computeLifecycleStatus({
        createdAt: new Date(),
        activeRetentionSnapshot: null,
        inactiveRetentionSnapshot: null,
        dispositionStatus: null,
        isUnderLegalHold: true,
      });
      expect(result).toBe('Legal Hold');
    });

    it('should return Destroyed if dispositionStatus is DESTROYED', () => {
      const result = service.computeLifecycleStatus({
        createdAt: new Date(),
        activeRetentionSnapshot: null,
        inactiveRetentionSnapshot: null,
        dispositionStatus: 'DESTROYED',
        isUnderLegalHold: false,
      });
      expect(result).toBe('Destroyed');
    });

    it('should return Active if no retention schedule exists', () => {
      const result = service.computeLifecycleStatus({
        createdAt: new Date(),
        activeRetentionSnapshot: null,
        inactiveRetentionSnapshot: null,
        dispositionStatus: null,
        isUnderLegalHold: false,
      });
      expect(result).toBe('Active');
    });

    it('should return Ready if current date is past active and inactive retention periods', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 5);

      const result = service.computeLifecycleStatus({
        createdAt: pastDate,
        activeRetentionSnapshot: 1, // 1 year active
        inactiveRetentionSnapshot: 1, // 1 year inactive
        dispositionStatus: null,
        isUnderLegalHold: false,
      });
      expect(result).toBe('Ready');
    });

    it('should return Inactive if current date is past active but before inactive retention period', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 2);

      const result = service.computeLifecycleStatus({
        createdAt: pastDate,
        activeRetentionSnapshot: 1, // 1 year active
        inactiveRetentionSnapshot: 2, // 2 year inactive
        dispositionStatus: null,
        isUnderLegalHold: false,
      });
      expect(result).toBe('Inactive');
    });
  });

  describe('getReadyForDispositionDocuments', () => {
    it('should return early if no documents match the raw query', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getReadyForDispositionDocuments(
        'inst-id',
        'user-id',
        {},
        {
          skip: 0,
          take: 10,
          selectFields: { id: true },
        },
      );

      expect(result).toEqual({ totalCount: 0, documents: [] });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should query and return documents correctly', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'doc-1' }]);
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        1,
        [{ id: 'doc-1', title: 'Test Doc' }],
      ]);

      const result = await service.getReadyForDispositionDocuments(
        'inst-id',
        'user-id',
        {},
        {
          skip: 0,
          take: 10,
          selectFields: { id: true, title: true },
        },
      );

      expect(result).toEqual({
        totalCount: 1,
        documents: [{ id: 'doc-1', title: 'Test Doc' }],
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
