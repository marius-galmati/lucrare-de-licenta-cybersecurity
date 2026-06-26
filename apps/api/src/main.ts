import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ascundem amprenta framework-ului
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Anteturi de securitate
  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP este gestionat de Next.js
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Filtru global de excepții — normalizează toate răspunsurile de eroare
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validarea datelor de intrare cu măsuri suplimentare de securitate
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // CORS — restricționat exclusiv la originea frontend-ului
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`CyberXscore API running on port ${port}`);
}
bootstrap();
