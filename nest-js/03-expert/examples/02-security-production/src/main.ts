import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { ShutdownService } from './shutdown.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });

  app.use(helmet());

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.enableShutdownHooks();

  const shutdownService = app.get(ShutdownService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (shutdownService.isShuttingDown) {
      res.status(503).json({ error: 'Server is shutting down' });
      return;
    }
    next();
  });

  await app.listen(3100);
  console.log('Security Production demo → http://localhost:3100');
  console.log('Health check → http://localhost:3100/health');
}
bootstrap();
