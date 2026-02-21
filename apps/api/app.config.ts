import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { env } from './src/env';

export function configureApp(app: INestApplication) {
  app.enableCors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  });
  app.use(helmet());
}
