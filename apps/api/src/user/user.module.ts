import { Module } from '@nestjs/common';
import { UserRouter } from './user.router';
import { PrismaModule } from '../prisma/prisma.module'; // 1. Add this import

@Module({
  imports: [PrismaModule], // 2. Add PrismaModule here
  providers: [UserRouter],
  exports: [UserRouter],
})
export class UserModule {}