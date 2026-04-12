import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TrpcRouter, AppRouter } from './trpc/trpc.router';
import { TrpcContextFactory } from './trpc/trpc.context';
import { INestApplication } from '@nestjs/common';
import { configureApp } from '../app.config';

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  configureApp(app);

  const trpcRouter = app.get(TrpcRouter);
  const router = trpcRouter.appRouter;

  const contextFactory = app.get(TrpcContextFactory);
  const createContext = contextFactory.createContext.bind(contextFactory);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router,
      createContext,
    }),
  );

  await app.listen(2000, '0.0.0.0');
  console.log('Backend running on http://localhost:2000');
}

bootstrap();
