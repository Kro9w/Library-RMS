// import { Module } from '@nestjs/common';
// import { DocumentsModule } from './documents/documents.module';

// @Module({
//   imports: [DocumentsModule]
// })
// export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service'; // 👈 Import PrismaService
import { DocumentsModule } from './documents/documents.module'; // 👈 Nest CLI should have added this

@Module({
  imports: [DocumentsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService], // 👈 Add PrismaService here
  exports: [PrismaService], // 👈 Export it to make it available everywhere
})
export class AppModule {}