import { Module } from '@nestjs/common';
import { DocumentsRouter } from './documents.router';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UserModule } from '../user/user.module';
import { LogModule } from '../log/log.module';
import { AccessControlService } from './access-control.service';

@Module({
  imports: [PrismaModule, SupabaseModule, UserModule, LogModule],
  providers: [DocumentsRouter, AccessControlService],
  exports: [DocumentsRouter, AccessControlService],
})
export class DocumentsModule {}
