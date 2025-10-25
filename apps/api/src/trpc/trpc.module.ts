// apps/api/src/trpc/trpc.module.ts
import { Module } from '@nestjs/common';
import { TrpcRouter } from './trpc.router';
import { DocumentsModule } from '../documents/documents.module';
import { UserModule } from '../user/user.module'; // Added

@Module({
  imports: [DocumentsModule, UserModule], // Added UserModule
  providers: [TrpcRouter],
  exports: [TrpcRouter],
})
export class TrpcModule {}