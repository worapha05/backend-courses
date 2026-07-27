import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Todos (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /todos returns empty array', () => {
    return request(app.getHttpServer()).get('/todos').expect(200).expect([]);
  });

  it('POST /todos creates a todo', () => {
    return request(app.getHttpServer())
      .post('/todos')
      .send({ title: 'E2E Test' })
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toBe('E2E Test');
        expect(res.body.id).toBeDefined();
      });
  });

  it('POST /todos rejects invalid payload', () => {
    return request(app.getHttpServer())
      .post('/todos')
      .send({ title: '' })
      .expect(400);
  });

  it('DELETE /todos/:id removes a todo', async () => {
    const res = await request(app.getHttpServer())
      .post('/todos')
      .send({ title: 'To delete' })
      .expect(201);

    return request(app.getHttpServer()).delete(`/todos/${res.body.id}`).expect(200);
  });
});
