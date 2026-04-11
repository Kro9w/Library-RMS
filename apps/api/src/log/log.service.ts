import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string,
    action: string,
    roles: string[],
    targetName?: string,
    campusId?: string,
    departmentId?: string,
  ) {
    const actionString = targetName ? `${action}: '${targetName}'` : action;

    await this.prisma.log.create({
      data: {
        action: actionString,
        userId,
        campusId,
        departmentId,
        userRole: roles.join(', '),
      },
    });
  }

  async logActionTx(
    tx: Prisma.TransactionClient,
    userId: string,
    action: string,
    roles: string[],
    targetName?: string,
    campusId?: string,
    departmentId?: string,
  ) {
    const actionString = targetName ? `${action}: '${targetName}'` : action;

    await tx.log.create({
      data: {
        action: actionString,
        userId,
        campusId,
        departmentId,
        userRole: roles.join(', '),
      },
    });
  }

  logError(message: string, error?: unknown) {
    console.error(message, error);
  }

  async logActions(
    logs: {
      userId: string;
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
      campusId: log.campusId,
      departmentId: log.departmentId,
      userRole: log.roles.join(', '),
    }));

    await this.prisma.log.createMany({
      data,
    });
  }

  async logActionsTx(
    tx: Prisma.TransactionClient,
    logs: {
      userId: string;
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
      campusId: log.campusId,
      departmentId: log.departmentId,
      userRole: log.roles.join(', '),
    }));

    await tx.log.createMany({
      data,
    });
  }
}
