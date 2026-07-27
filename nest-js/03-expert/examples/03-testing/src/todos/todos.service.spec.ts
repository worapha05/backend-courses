import { Test, TestingModule } from '@nestjs/testing';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';

describe('TodosService', () => {
  let service: TodosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodosService],
    }).compile();

    service = module.get<TodosService>(TodosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a todo', () => {
    const dto: CreateTodoDto = { title: 'Test todo' };
    const todo = service.create(dto);

    expect(todo).toBeDefined();
    expect(todo.id).toBe(1);
    expect(todo.title).toBe('Test todo');
    expect(todo.completed).toBe(false);
  });

  it('should find all todos', () => {
    service.create({ title: 'A' });
    service.create({ title: 'B' });

    const todos = service.findAll();
    expect(todos).toHaveLength(2);
  });

  it('should find one todo by id', () => {
    service.create({ title: 'Find me' });
    const todo = service.findOne(1);

    expect(todo.title).toBe('Find me');
  });

  it('should throw on missing todo', () => {
    expect(() => service.findOne(999)).toThrow();
  });
});
