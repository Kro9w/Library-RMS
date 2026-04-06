import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsRouter } from './documents.router';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AccessControlService } from './access-control.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentWorkflowService } from './document-workflow.service';

describe('DocumentsRouter', () => {
  let router: DocumentsRouter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsRouter,
        { provide: PrismaService, useValue: {} },
        { provide: LogService, useValue: {} },
        { provide: SupabaseService, useValue: {} },
        { provide: AccessControlService, useValue: {} },
        { provide: DocumentLifecycleService, useValue: {} },
        { provide: DocumentWorkflowService, useValue: {} },
      ],
    }).compile();

    router = module.get<DocumentsRouter>(DocumentsRouter);
  });

  it('should be defined', () => {
    expect(router).toBeDefined();
  });
});
