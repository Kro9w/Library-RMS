import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  public computeLifecycleStatus(doc: {
    createdAt: Date;
    activeRetentionSnapshot: number | null;
    activeRetentionMonthsSnapshot?: number | null;
    activeRetentionDaysSnapshot?: number | null;
    inactiveRetentionSnapshot: number | null;
    inactiveRetentionMonthsSnapshot?: number | null;
    inactiveRetentionDaysSnapshot?: number | null;
    dispositionStatus: string | null;
    isUnderLegalHold: boolean;
  }):
    | 'Active'
    | 'Inactive'
    | 'Ready'
    | 'Archived'
    | 'Destroyed'
    | 'Legal Hold'
    | null {
    if (doc.isUnderLegalHold) return 'Legal Hold';

    if (doc.dispositionStatus === 'DESTROYED') return 'Destroyed';
    if (doc.dispositionStatus === 'ARCHIVED') return 'Archived';

    // If no retention schedule, treat as Active
    if (
      doc.activeRetentionSnapshot === null ||
      doc.activeRetentionSnapshot === undefined
    ) {
      return 'Active';
    }

    const now = new Date();
    const created = new Date(doc.createdAt);

    const activeUntil = new Date(created);
    activeUntil.setFullYear(
      activeUntil.getFullYear() + doc.activeRetentionSnapshot,
    );
    activeUntil.setMonth(
      activeUntil.getMonth() + (doc.activeRetentionMonthsSnapshot || 0),
    );
    activeUntil.setDate(
      activeUntil.getDate() + (doc.activeRetentionDaysSnapshot || 0),
    );

    if (now < activeUntil) return 'Active';

    const inactiveUntil = new Date(activeUntil);
    inactiveUntil.setFullYear(
      inactiveUntil.getFullYear() + (doc.inactiveRetentionSnapshot || 0),
    );
    inactiveUntil.setMonth(
      inactiveUntil.getMonth() + (doc.inactiveRetentionMonthsSnapshot || 0),
    );
    inactiveUntil.setDate(
      inactiveUntil.getDate() + (doc.inactiveRetentionDaysSnapshot || 0),
    );

    if (now < inactiveUntil) return 'Inactive';

    return 'Ready';
  }

  public async getReadyForDispositionDocuments(
    institutionId: string,
    userId: string,
    aclWhere: Prisma.DocumentWhereInput,
    options: {
      filter?: 'mine' | 'all';
      search?: string;
      skip: number;
      take: number;
      selectFields: any;
    },
  ) {
    const lifecycleWhereClause: Prisma.DocumentWhereInput = {
      institutionId: institutionId,
      dispositionStatus: { notIn: ['DESTROYED', 'ARCHIVED'] },
      activeRetentionSnapshot: { not: null },
      AND: [aclWhere],
    };

    if (options.filter === 'mine') {
      lifecycleWhereClause.uploadedById = userId;
    }

    if (options.search) {
      lifecycleWhereClause.title = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    const rawQuery = Prisma.sql`
      SELECT d.id
      FROM "Document" d
      WHERE d."institutionId" = ${institutionId}
        AND d."dispositionStatus" NOT IN ('DESTROYED', 'ARCHIVED')
        AND d."activeRetentionSnapshot" IS NOT NULL
        AND d."isUnderLegalHold" = false
        AND (d."createdAt" + 
             make_interval(years => d."activeRetentionSnapshot") + 
             make_interval(months => COALESCE(d."activeRetentionMonthsSnapshot", 0)) + 
             make_interval(days => COALESCE(d."activeRetentionDaysSnapshot", 0))) <= NOW()
        AND (d."createdAt" + 
             make_interval(years => d."activeRetentionSnapshot") + 
             make_interval(months => COALESCE(d."activeRetentionMonthsSnapshot", 0)) + 
             make_interval(days => COALESCE(d."activeRetentionDaysSnapshot", 0)) + 
             make_interval(years => COALESCE(d."inactiveRetentionSnapshot", 0)) +
             make_interval(months => COALESCE(d."inactiveRetentionMonthsSnapshot", 0)) +
             make_interval(days => COALESCE(d."inactiveRetentionDaysSnapshot", 0))) <= NOW()
    `;

    const rawResults = await this.prisma.$queryRaw<{ id: string }[]>(rawQuery);
    const matchingLifecycleIds = rawResults.map((r) => r.id);

    if (matchingLifecycleIds.length === 0) {
      return { documents: [], totalCount: 0 };
    }

    lifecycleWhereClause.id = { in: matchingLifecycleIds };

    const [totalCount, documents] = await this.prisma.$transaction([
      this.prisma.document.count({ where: lifecycleWhereClause }),
      this.prisma.document.findMany({
        where: lifecycleWhereClause,
        select: options.selectFields,
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
      }),
    ]);

    return { totalCount, documents };
  }
}
