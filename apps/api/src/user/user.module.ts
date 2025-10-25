// apps/api/src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserRouter } from './user.router'; // Changed to capitalized 'UserRouter' class

@Module({
  providers: [UserRouter],
  exports: [UserRouter],
})
export class UserModule {}