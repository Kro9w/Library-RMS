import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsRouter } from './notifications.router';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsRouter],
  exports: [NotificationsRouter],
})
export class NotificationsModule {}
