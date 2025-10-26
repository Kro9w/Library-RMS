import { Module } from '@nestjs/common';
import { DocumentsRouter } from './documents.router';
import { PrismaModule } from '../prisma/prisma.module'; // 1. Add this import
import { SupabaseModule } from '../supabase/supabase.module'; // 2. Add this import

@Module({
  imports: [PrismaModule, SupabaseModule], // 3. Add both modules here
  providers: [DocumentsRouter],
  exports: [DocumentsRouter],
})
export class DocumentsModule {}