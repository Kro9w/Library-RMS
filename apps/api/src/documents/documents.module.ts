import { Module } from '@nestjs/common';
import { DocumentsRouter } from './documents.router';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UserModule } from '../user/user.module';
import { LogModule } from '../log/log.module';
import { AccessControlModule } from './access-control.module';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentWorkflowService } from './document-workflow.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    UserModule,
    LogModule,
    AccessControlModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsRouter, DocumentLifecycleService, DocumentWorkflowService],
  exports: [DocumentsRouter, DocumentLifecycleService, DocumentWorkflowService],
})
export class DocumentsModule {}
