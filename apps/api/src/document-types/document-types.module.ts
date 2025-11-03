// apps/api/src/document-types/document-types.module.ts
import { Module } from '@nestjs/common';
import { DocumentTypesRouter } from './document-types.router';

@Module({
  providers: [DocumentTypesRouter],
  exports: [DocumentTypesRouter],
})
export class DocumentTypesModule {}
