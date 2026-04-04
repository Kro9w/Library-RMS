import { Module } from '@nestjs/common';
import { RolesRouter } from './roles.router';
import { RolesService } from './roles.service';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AccessControlModule } from '../documents/access-control.module';

@Module({
  imports: [UserModule, PrismaModule, AccessControlModule],
  providers: [RolesRouter, RolesService],
  exports: [RolesRouter, RolesService],
})
export class RolesModule {}
