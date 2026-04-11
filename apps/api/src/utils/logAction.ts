import { Prisma } from '@prisma/client';

export interface LogActionParams {
  userId: string;
  action: string;
  roles: string[];
  targetName?: string;
  campusId?: string;
  departmentId?: string;
}

export async function logAction(
  prisma: { log: { create: (args: Prisma.LogCreateArgs) => Promise<unknown> } },
  params: LogActionParams,
): Promise<void> {
  const actionString = params.targetName
    ? `${params.action}: '${params.targetName}'`
    : params.action;

  await prisma.log.create({
    data: {
      action: actionString,
      userId: params.userId,
      campusId: params.campusId,
      departmentId: params.departmentId,
      userRole: params.roles.join(', '),
    },
  });
}
