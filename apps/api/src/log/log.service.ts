import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string,
    organizationId: string,
    action: string,
    roles: string[],
    targetName?: string, // Optional parameter for enriched logging
  ) {
    const actionString = targetName ? `${action}: '${targetName}'` : action;

    this.prisma.log
      .create({
        data: {
          action: actionString,
          userId,
          organizationId,
          userRole: roles.join(', '),
        },
      })
      .catch((e) => {
        console.error('Failed to create log entry', e);
      });
  }

  async logActions(
    logs: {
      userId: string;
      organizationId: string;
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
      organizationId: log.organizationId,
      userRole: log.roles.join(', '),
    }));

    this.prisma.log
      .createMany({
        data,
      })
      .catch((e) => {
        console.error('Failed to create multiple log entries', e);
      });
  }
}
