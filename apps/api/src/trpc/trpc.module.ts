import { Module } from '@nestjs/common';
import { TrpcRouter } from './trpc.router';
import { TrpcContextFactory } from './trpc.context';
import { DocumentsModule } from '../documents/documents.module';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module'; // 1. Add this import
import { SupabaseModule } from '../supabase/supabase.module'; // 2. Add this import
import { RolesModule } from '../roles/roles.module';
import { DocumentTypesModule } from '../document-types/document-types.module';

@Module({
  // 3. Add PrismaModule and SupabaseModule here
  imports: [
    DocumentsModule,
    UserModule,
    PrismaModule,
    SupabaseModule,
    RolesModule,
    DocumentTypesModule,
  ],
  providers: [TrpcRouter, TrpcContextFactory],
  exports: [TrpcRouter, TrpcContextFactory],
})
export class TrpcModule {}