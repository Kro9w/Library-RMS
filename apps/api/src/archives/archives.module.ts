import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ArchivesRouter } from './archives.router';

@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [ArchivesRouter],
  exports: [ArchivesRouter],
})
export class ArchivesModule {}
