import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LogModule } from '../log/log.module';
import { AccessControlModule } from '../documents/access-control.module';

@Module({
  imports: [PrismaModule, LogModule, AccessControlModule],
  providers: [UserRouter, UserService],
  exports: [UserRouter, UserService],
})
export class UserModule {}
