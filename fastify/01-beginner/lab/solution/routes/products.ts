import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import type { Product } from '../plugins/product-store.js';

type CreateProductBody = {
  name: string;
  price: number;
  stock: number;
};

export const productsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/products', async () => {
    return {
      service: fastify.appConfig.serviceName,
      items: [...fastify.productRepo.values()],
    };
  });

  fastify.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const product = fastify.productRepo.get(request.params.id);

    if (!product) {
      return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND' });
    }

    return product;
  });

  fastify.post<{ Body: CreateProductBody }>('/products', async (request, reply) => {
    const { name, price, stock } = request.body ?? ({} as CreateProductBody);

    if (!name || typeof price !== 'number' || typeof stock !== 'number' || price < 0 || stock < 0) {
      return reply.code(400).send({ error: 'INVALID_PRODUCT' });
    }

    const product: Product = {
      id: randomUUID(),
      name,
      price,
      stock,
      createdAt: new Date().toISOString(),
    };

    fastify.productRepo.set(product.id, product);
    request.log.info({ productId: product.id }, 'product.created');

    return reply.code(201).send(product);
  });

  fastify.delete<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const existed = fastify.productRepo.delete(request.params.id);

    if (!existed) {
      return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND' });
    }

    request.log.info({ productId: request.params.id }, 'product.deleted');

    return reply.code(204).send();
  });
};
