import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from './trpc/trpc.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { DocumentsModule } from './documents/documents.module';
import { RolesModule } from './roles/roles.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    TrpcModule,
    PrismaModule,
    UserModule,
    DocumentsModule,
    SupabaseModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
