import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3101);
  console.log('Prisma demo → http://localhost:3101/authors');
}
bootstrap();
