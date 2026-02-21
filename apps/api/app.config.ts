import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export function configureApp(app: INestApplication) {
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://localhost:5173',
      'https://localhost:3000',
    ],
    credentials: true,
  });
  app.use(helmet());
}
