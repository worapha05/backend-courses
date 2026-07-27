import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthorsModule } from './authors/authors.module';
import { BooksModule } from './books/books.module';

@Module({
  imports: [PrismaModule, AuthorsModule, BooksModule],
})
export class AppModule {}
