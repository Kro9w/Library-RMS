// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from './trpc/trpc.module';
// import { DocumentsModule } from './documents/documents.module'; // <-- REMOVE THIS LINE
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseAdminModule } from './firebase/firebase-admin.module';

@Module({
  imports: [
    TrpcModule,
    // DocumentsModule, // <-- Make sure this is removed
    PrismaModule,
    FirebaseAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}