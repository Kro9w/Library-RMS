import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccessControlService {
  /**
   * Generates a Prisma WHERE clause snippet to filter documents
   * based on the user's ACL (DocumentAccess records).
   *
   * A user has access to a document if ANY of the following match in `DocumentAccess`:
   * - Their user ID
   * - Any of their assigned roles
   * - Their department
   * - Their campus
   * - Their institution
   */
  public generateAclWhereClause(userCtx: {
    id: string;
    institutionId?: string | null;
    campusId?: string | null;
    departmentId?: string | null;
    roles?: { id: string }[];
  }, requiredPermission: 'READ' | 'WRITE' = 'READ'): Prisma.DocumentWhereInput {
    const roleIds = userCtx.roles?.map((r) => r.id) || [];

    const aclConditions: Prisma.DocumentAccessWhereInput[] = [
      { userId: userCtx.id },
    ];

    if (userCtx.institutionId) {
      aclConditions.push({ institutionId: userCtx.institutionId });
    }

    if (userCtx.campusId) {
      aclConditions.push({ campusId: userCtx.campusId });
    }

    if (userCtx.departmentId) {
      aclConditions.push({ departmentId: userCtx.departmentId });
    }

    if (roleIds.length > 0) {
      aclConditions.push({ roleId: { in: roleIds } });
    }

    const baseSome: Prisma.DocumentAccessWhereInput = {
      OR: aclConditions,
    };

    if (requiredPermission === 'WRITE') {
      baseSome.permission = 'WRITE';
    }

    return {
      documentAccesses: {
        some: baseSome,
      },
    };
  }
}
