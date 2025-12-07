import { Module } from '@nestjs/common';
import { LogRouter } from './log.router';
import { LogService } from './log.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LogRouter, LogService],
  exports: [LogRouter, LogService],
})
export class LogModule {}
