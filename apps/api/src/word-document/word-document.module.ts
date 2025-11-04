import { Module } from '@nestjs/common';
import { WordDocumentRouter } from './word-document.router';
import { WordDocumentService } from './word-document.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [WordDocumentRouter, WordDocumentService],
  exports: [WordDocumentRouter],
})
export class WordDocumentModule {}
