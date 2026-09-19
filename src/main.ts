import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { PinoLoggerService } from './common/logger/pino-logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Buffer logs until we attach the Pino logger
    bufferLogs: true,
  });

  // Use Pino as the NestJS system logger (bootstrap & framework logs)
  app.useLogger(app.get(PinoLoggerService));

  // Security
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      '*',
    ],
  });

  // Prevent browser 304 caching on API responses
  // app.use((_req: any, res: any, next: any) => {
  //   res.set('Cache-Control', 'no-store');
  //   next();
  // });

  // Serve uploaded files statically
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Assets Marketplace API')
    .setDescription(
      'REST API for the Assets Marketplace — digital gaming asset trading platform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const startupLogger = app.get(PinoLoggerService);
  startupLogger.log(
    `Assets Marketplace API running on http://localhost:${port}`,
    'Bootstrap',
  );
  startupLogger.log(
    `Swagger docs at http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}
bootstrap();
