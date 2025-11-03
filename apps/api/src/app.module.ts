import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from './trpc/trpc.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { DocumentsModule } from './documents/documents.module';
import { RolesModule } from './roles/roles.module';
// import { FirebaseAdminModule } from './firebase/firebase-admin.module'; // Remove this
import { SupabaseModule } from './supabase/supabase.module'; // Add this

@Module({
  imports: [
    TrpcModule,
    PrismaModule,
    UserModule,
    DocumentsModule,
    // FirebaseAdminModule, // Remove this
    SupabaseModule, // Add this
    RolesModule, // Add this
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}