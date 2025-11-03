// apps/api/src/roles/roles.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesService } from './roles.service';

@Module({
  imports: [PrismaModule],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
