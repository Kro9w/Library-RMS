import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e: any) {
      console.warn(
        'Prisma connection failed on ModuleInit, possibly expected in testing:',
        e.message,
      );
    }
  }
}
