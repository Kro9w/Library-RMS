// apps/api/src/documents/documents.module.ts

import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module'; // 👈 1. Import PrismaModule

@Module({
  imports: [PrismaModule], // 👈 2. Add it to the imports array
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}