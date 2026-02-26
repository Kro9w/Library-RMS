import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TrpcRouter } from '../src/trpc/trpc.router';
import * as trpcExpress from '@trpc/server/adapters/express';
import { SupabaseService } from '../src/supabase/supabase.service';

// Mock env
jest.mock('../src/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://mock:5432/mock',
    DIRECT_URL: 'postgresql://mock:5432/mock',
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-key',
    SUPABASE_BUCKET_NAME: 'documents',
    NODE_ENV: 'test',
  },
}));

describe('DocumentsRouter (e2e)', () => {
  let app: INestApplication;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'authenticated',
  };

  const mockDbUser = {
    id: 'user-123',
    organizationId: 'org-123',
    roles: [],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUnique: jest.fn().mockResolvedValue(mockDbUser),
        },
        document: {
          create: jest.fn().mockResolvedValue({ id: 'doc-123', title: 'test' }),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        documentType: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        log: {
          create: jest.fn().mockResolvedValue({}),
        },
      })
      .overrideProvider(SupabaseService)
      .useValue({
        getAdminClient: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Manually mount tRPC middleware, similar to main.ts
    const trpcRouter = app.get(TrpcRouter);
    const router = trpcRouter.appRouter;

    // Custom context creation to bypass auth and inject mock user
    const createContext = async () => ({
      user: mockUser,
      dbUser: mockDbUser,
      prisma: app.get(PrismaService),
    });

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(
      '/trpc',
      trpcExpress.createExpressMiddleware({
        router: router as any,
        createContext,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return storage configuration', async () => {
    const response = await request(app.getHttpServer())
      .get('/trpc/documents.getStorageConfig')
      .expect(200);

    expect(response.body.result.data).toEqual({
      bucketName: 'documents',
    });
  });

  it('should allow upload with valid storage key and bucket', async () => {
    // Expected storageKey prefix: user-123/
    const input = {
      title: 'Valid Doc',
      storageKey: 'user-123/valid-file.pdf',
      storageBucket: 'documents',
    };

    const response = await request(app.getHttpServer())
      .post('/trpc/documents.createDocumentRecord')
      .send(input)
      .expect(200);

    // tRPC returns result wrapped in "result": { "data": ... }
    expect(response.body.result.data).toEqual(
      expect.objectContaining({ id: 'doc-123' }),
    );
  });

  it('should fail with invalid bucket', async () => {
    const input = {
      title: 'Invalid Bucket Doc',
      storageKey: 'user-123/valid-file.pdf',
      storageBucket: 'other-bucket',
    };

    // Before fix, this will pass (200). After fix, it should be 403 Forbidden.
    // We expect 403. If it returns 200, the test fails (indicating vulnerability).
    await request(app.getHttpServer())
      .post('/trpc/documents.createDocumentRecord')
      .send(input)
      .expect(403);
  });

  it('should fail with invalid storage key (wrong user prefix)', async () => {
    const input = {
      title: 'Invalid Key Doc',
      storageKey: 'other-user/file.pdf',
      storageBucket: 'documents',
    };

    // Before fix, this will pass (200). After fix, it should be 403 Forbidden.
    await request(app.getHttpServer())
      .post('/trpc/documents.createDocumentRecord')
      .send(input)
      .expect(403);
  });
});
