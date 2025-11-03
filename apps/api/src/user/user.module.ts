import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserRouter, UserService],
  exports: [UserRouter, UserService],
})
export class UserModule {}
