import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  public computeLifecycleStatus(doc: {
    createdAt: Date;
    lifecycle?: {
      activeRetentionSnapshot: number | null;
      activeRetentionMonthsSnapshot?: number | null;
      activeRetentionDaysSnapshot?: number | null;
      inactiveRetentionSnapshot: number | null;
      inactiveRetentionMonthsSnapshot?: number | null;
      inactiveRetentionDaysSnapshot?: number | null;
      dispositionStatus: string | null;
      isUnderLegalHold: boolean;
    } | null;
  }):
    | 'Active'
    | 'Inactive'
    | 'Ready'
    | 'Archived'
    | 'Destroyed'
    | 'Legal Hold'
    | null {
    if (!doc.lifecycle) return 'Active';

    if (doc.lifecycle.isUnderLegalHold) return 'Legal Hold';

    if (doc.lifecycle.dispositionStatus === 'DESTROYED') return 'Destroyed';
    if (doc.lifecycle.dispositionStatus === 'ARCHIVED') return 'Archived';

    const now = new Date();
    const created = new Date(doc.createdAt);

    const activeUntil = new Date(created);
    activeUntil.setFullYear(
      activeUntil.getFullYear() + (doc.lifecycle.activeRetentionSnapshot ?? 0),
    );
    activeUntil.setMonth(
      activeUntil.getMonth() +
        (doc.lifecycle.activeRetentionMonthsSnapshot ?? 0),
    );
    activeUntil.setDate(
      activeUntil.getDate() + (doc.lifecycle.activeRetentionDaysSnapshot ?? 0),
    );

    if (now < activeUntil) return 'Active';

    const inactiveUntil = new Date(activeUntil);
    inactiveUntil.setFullYear(
      inactiveUntil.getFullYear() +
        (doc.lifecycle.inactiveRetentionSnapshot ?? 0),
    );
    inactiveUntil.setMonth(
      inactiveUntil.getMonth() +
        (doc.lifecycle.inactiveRetentionMonthsSnapshot ?? 0),
    );
    inactiveUntil.setDate(
      inactiveUntil.getDate() +
        (doc.lifecycle.inactiveRetentionDaysSnapshot ?? 0),
    );

    if (now < inactiveUntil) return 'Inactive';

    return 'Ready';
  }

  public async getReadyForDispositionDocuments(
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
      lifecycle: {
        dispositionStatus: { notIn: ['DESTROYED', 'ARCHIVED'] },
      },
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
      INNER JOIN "DocumentLifecycle" l ON d.id = l."documentId"
      WHERE (l."dispositionStatus" NOT IN ('DESTROYED', 'ARCHIVED') OR l."dispositionStatus" IS NULL)
        AND l."isUnderLegalHold" = false
        AND (d."createdAt" + 
             make_interval(years => COALESCE(l."activeRetentionSnapshot", 0)) + 
             make_interval(months => COALESCE(l."activeRetentionMonthsSnapshot", 0)) + 
             make_interval(days => COALESCE(l."activeRetentionDaysSnapshot", 0))) <= NOW()
        AND (d."createdAt" + 
             make_interval(years => COALESCE(l."activeRetentionSnapshot", 0)) + 
             make_interval(months => COALESCE(l."activeRetentionMonthsSnapshot", 0)) + 
             make_interval(days => COALESCE(l."activeRetentionDaysSnapshot", 0)) + 
             make_interval(years => COALESCE(l."inactiveRetentionSnapshot", 0)) +
             make_interval(months => COALESCE(l."inactiveRetentionMonthsSnapshot", 0)) +
             make_interval(days => COALESCE(l."inactiveRetentionDaysSnapshot", 0))) <= NOW()
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
