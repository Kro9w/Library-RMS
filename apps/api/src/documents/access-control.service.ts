import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { TRPCError } from '@trpc/server';

@Injectable()
export class AccessControlService {
  public checkPermission(
    user: { roles?: Role[] } | undefined,
    permission: keyof Role,
  ): boolean {
    if (!user?.roles) return false;

    if (user.roles.some((role: Role) => role.canManageInstitution)) return true;

    return user.roles.some((role: Role) => role[permission] === true);
  }

  public requirePermission(
    user: { roles?: Role[] } | undefined,
    permission: keyof Role,
  ): void {
    if (!this.checkPermission(user, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to ${String(permission)}.`,
      });
    }
  }

  /**
   * Generates a Prisma WHERE clause snippet to filter documents
   * based on the user's ACL (DocumentAccess records).
   *
   * A user has access to a document if ANY of the following match in `DocumentAccess`:
   * - Their user ID
   * - Any of their assigned roles
   * - Their department
   * - Their campus
   */
  public generateAclWhereClause(
    userCtx: {
      id: string;
      campusId?: string | null;
      departmentId?: string | null;
      roles?: { id: string }[];
    },
    requiredPermission: 'READ' | 'WRITE' = 'READ',
  ): Prisma.DocumentWhereInput {
    const roleIds = userCtx.roles?.map((r) => r.id) || [];

    const aclConditions: Prisma.DocumentAccessWhereInput[] = [
      { userId: userCtx.id },
    ];

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
