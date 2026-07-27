import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookDto, ListBooksQueryDto, UpdateBookDto } from './dto/book.dto';

export interface Book {
  id: string;
  title: string;
  author: string;
  pages: number;
  isbn?: string;
}

@Injectable()
export class BooksService {
  private readonly books: Book[] = [
    {
      id: '1',
      title: 'Domain-Driven Design',
      author: 'Eric Evans',
      pages: 560,
      isbn: '978-0321125217',
    },
  ];

  findAll(query: ListBooksQueryDto) {
    let data = [...this.books];
    if (query.q) {
      const q = query.q.toLowerCase();
      data = data.filter(
        (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
      );
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const start = (page - 1) * limit;
    return {
      meta: { page, limit, total: data.length },
      data: data.slice(start, start + limit),
    };
  }

  create(dto: CreateBookDto): Book {
    const book: Book = { id: String(Date.now()), ...dto };
    this.books.push(book);
    return book;
  }

  update(id: string, dto: UpdateBookDto): Book {
    const idx = this.books.findIndex((b) => b.id === id);
    if (idx < 0) throw new NotFoundException(`Book ${id} not found`);
    this.books[idx] = { ...this.books[idx], ...dto };
    return this.books[idx];
  }
}
