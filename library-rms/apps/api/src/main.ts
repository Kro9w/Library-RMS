import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables!');
}
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './trpc/trpc.router';
import { createContext } from './trpc/trpc.context';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.enableCors({ origin: ['http://localhost:5173'], credentials: true });

  // Mount tRPC manually
const expressApp = app.getHttpAdapter().getInstance();
expressApp.use('/trpc', trpcExpress.createExpressMiddleware({ router: appRouter, createContext }));

  await app.listen(3000);
  console.log('Backend running on http://localhost:3000');
}

bootstrap();