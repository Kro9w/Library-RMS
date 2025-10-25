// apps/api/src/main.ts
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as trpcExpress from '@trpc/server/adapters/express';
// 1. FIXED: Import the TrpcRouter CLASS and AppRouter TYPE
import { TrpcRouter, AppRouter } from './trpc/trpc.router';
// 2. FIXED: Import our NestJS-aware context factory
import { trpcContextFactory } from './trpc/trpc.context';
// 3. REMOVED: Clerk import
// import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { INestApplication } from '@nestjs/common';

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  app.enableCors({ origin: ['http://localhost:5173'], credentials: true });

  // 4. REMOVED: Clerk middleware
  // app.use(ClerkExpressWithAuth());

  // 5. FIXED: Mount tRPC by getting the router and context from the Nest app
  const trpcRouter = app.get(TrpcRouter);
  const router = trpcRouter.appRouter;
  const createContext = trpcContextFactory(app);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: router as AppRouter, // Use the router instance
      createContext, // Use the context factory
    }),
  );

  await app.listen(3000);
  console.log('Backend running on http://localhost:3000');
}

bootstrap();