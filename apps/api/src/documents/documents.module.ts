// apps/api/src/documents/documents.module.ts
import { Module } from '@nestjs/common';
import { DocumentsRouter } from './documents.router';

@Module({
  providers: [DocumentsRouter],
  exports: [DocumentsRouter],
})
export class DocumentsModule {}