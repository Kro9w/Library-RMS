
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string,
    organizationId: string,
    action: string,
    roles: string[]
  ) {
    try {
        await this.prisma.log.create({
        data: {
            action,
            userId,
            organizationId,
            userRole: roles.join(', '),
        },
        });
    } catch (e) {
        console.error("Failed to create log entry", e);
    }
  }
}
