import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  await app.listen(3110);
  console.log('Library API → http://localhost:3110');
  console.log('Members → POST/GET /members');
  console.log('Titles  → POST/GET /titles');
  console.log('Loans   → POST /loans | POST /loans/:id/return | GET /loans?status=');
}
bootstrap();
