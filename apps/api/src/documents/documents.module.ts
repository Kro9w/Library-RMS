import { Module } from '@nestjs/common';
import { DocumentsRouter } from './documents.router';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UserModule } from '../user/user.module';
import { LogModule } from '../log/log.module';

@Module({
  imports: [PrismaModule, SupabaseModule, UserModule, LogModule],
  providers: [DocumentsRouter],
  exports: [DocumentsRouter],
})
export class DocumentsModule {}
