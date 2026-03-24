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
  ) {
    const actionString = targetName ? `${action}: '${targetName}'` : action;

    await this.prisma.log.create({
      data: {
        action: actionString,
        userId,
        institutionId,
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
    }[],
  ) {
    const data = logs.map((log) => ({
      action: log.targetName
        ? `${log.action}: '${log.targetName}'`
        : log.action,
      userId: log.userId,
      institutionId: log.institutionId,
      userRole: log.roles.join(', '),
    }));

    await this.prisma.log.createMany({
      data,
    });
  }
}
