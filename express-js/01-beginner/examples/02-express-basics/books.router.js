import { Router } from 'express';

const books = [
  { id: 1, title: 'Clean Architecture', author: 'Robert C. Martin', year: 2017 },
  { id: 2, title: 'Node.js Design Patterns', author: 'Mario Casciaro', year: 2020 },
];

let nextId = 3;

export const booksRouter = Router();

// GET /api/books?author=Martin
booksRouter.get('/', (req, res) => {
  const { author } = req.query;
  const result = author
    ? books.filter((b) => b.author.toLowerCase().includes(String(author).toLowerCase()))
    : books;
  res.json({ data: result, count: result.length });
});

// GET /api/books/:id
booksRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: { message: 'Book not found' } });
  }
  return res.json({ data: book });
});

// POST /api/books
booksRouter.post('/', (req, res) => {
  const { title, author, year } = req.body ?? {};
  if (!title || !author) {
    return res.status(400).json({
      error: { message: 'title and author are required' },
    });
  }
  const book = {
    id: nextId++,
    title: String(title),
    author: String(author),
    year: year != null ? Number(year) : null,
  };
  books.push(book);
  return res.status(201).json({ data: book });
});

// PATCH /api/books/:id
booksRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: { message: 'Book not found' } });
  }
  const { title, author, year } = req.body ?? {};
  if (title != null) book.title = String(title);
  if (author != null) book.author = String(author);
  if (year != null) book.year = Number(year);
  return res.json({ data: book });
});

// DELETE /api/books/:id
booksRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = books.findIndex((b) => b.id === id);
  if (index === -1) {
    return res.status(404).json({ error: { message: 'Book not found' } });
  }
  const [removed] = books.splice(index, 1);
  return res.json({ data: removed });
});
