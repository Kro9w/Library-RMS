import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string,
    institutionId: string,
    action: string,
    roles: string[],
    targetName?: string, // Optional parameter for enriched logging
    campusId?: string,
    departmentId?: string,
  ) {
    const actionString = targetName ? `${action}: '${targetName}'` : action;

    await this.prisma.log.create({
      data: {
        action: actionString,
        userId,
        institutionId,
        campusId,
        departmentId,
        userRole: roles.join(', '),
      },
    });
  }

  async logActions(
    logs: {
      userId: string;
      institutionId: string;
      action: string;
      roles: string[];
      targetName?: string;
      campusId?: string;
      departmentId?: string;
    }[],
  ) {
    const data = logs.map((log) => ({
      action: log.targetName
        ? `${log.action}: '${log.targetName}'`
        : log.action,
      userId: log.userId,
      institutionId: log.institutionId,
      campusId: log.campusId,
      departmentId: log.departmentId,
      userRole: log.roles.join(', '),
    }));

    await this.prisma.log.createMany({
      data,
    });
  }
}
