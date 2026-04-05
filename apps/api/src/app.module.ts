import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from './trpc/trpc.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RolesModule } from './roles/roles.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ArchivesModule } from './archives/archives.module';

@Module({
  imports: [
    TrpcModule,
    PrismaModule,
    UserModule,
    DocumentsModule,
    SupabaseModule,
    RolesModule,
    NotificationsModule,
    ArchivesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
