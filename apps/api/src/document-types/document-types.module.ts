// apps/api/src/document-types/document-types.module.ts
import { Module } from '@nestjs/common';
import { DocumentTypesRouter } from './document-types.router';
import { LogModule } from '../log/log.module';

@Module({
  imports: [LogModule],
  providers: [DocumentTypesRouter],
  exports: [DocumentTypesRouter],
})
export class DocumentTypesModule {}
