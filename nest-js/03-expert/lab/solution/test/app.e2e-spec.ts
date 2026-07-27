import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Expert Lab (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /health/live returns 200', () => {
      return request(app.getHttpServer()).get('/health/live').expect(200);
    });

    it('GET /health/ready returns 200', () => {
      return request(app.getHttpServer()).get('/health/ready').expect(200);
    });
  });

  describe('Catalog (public)', () => {
    it('GET /catalog returns products', () => {
      return request(app.getHttpServer())
        .get('/catalog')
        .expect(200)
        .expect((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('GET /catalog/:id returns a product', () => {
      return request(app.getHttpServer())
        .get('/catalog/p1')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.name).toBe('Wireless Mouse');
        });
    });
  });
});
