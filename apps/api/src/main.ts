// apps/api/src/main.ts
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TrpcRouter, AppRouter } from './trpc/trpc.router';
// FIX: Import the class 'TrpcContextFactory' (uppercase T)
import { TrpcContextFactory } from './trpc/trpc.context';
import { INestApplication } from '@nestjs/common';

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  app.enableCors({
    origin: ['http://localhost:5173', 'https://localhost:5173', 'https://localhost:3000'],
    credentials: true,
  });

  // Mount tRPC by getting the router and context from the Nest app
  const trpcRouter = app.get(TrpcRouter);
  const router = trpcRouter.appRouter;

  // Get the factory instance from Nest and bind its 'createContext' method
  const contextFactory = app.get(TrpcContextFactory);
  const createContext = contextFactory.createContext.bind(contextFactory);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: router as AppRouter, // Use the router instance
      createContext, // Use the bound context factory method
    }),
  );

  await app.listen(2000, '0.0.0.0');
  console.log('Backend running on http://localhost:2000');
}

bootstrap();