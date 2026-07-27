import type { FastifyPluginAsync } from 'fastify';
import {
  createItemSchema,
  getItemSchema,
  listItemsSchema,
  purchaseSchema,
} from '../schemas/catalog.js';

export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  // Client-facing reads + purchase
  await fastify.register(async (client) => {
    client.addHook('preHandler', async (request, reply) => {
      if (request.headers['x-api-key'] !== 'expert-client') {
        return reply.code(401).send({ error: 'UNAUTHORIZED' });
      }
    });

    client.get('/items', { schema: listItemsSchema }, async () => {
      const items = await fastify.catalogService.list();

      return { items };
    });

    client.get<{ Params: { sku: string } }>(
      '/items/:sku',
      { schema: getItemSchema },
      async (request) => fastify.catalogService.get(request.params.sku),
    );

    client.post<{ Params: { sku: string }; Body: { qty: number } }>(
      '/items/:sku/purchase',
      { schema: purchaseSchema },
      async (request) => {
        const item = await fastify.catalogService.purchase(request.params.sku, request.body.qty);
        request.log.info({ sku: item.sku, qty: request.body.qty }, 'catalog.purchased');

        return item;
      },
    );
  });

  // Admin-only create
  await fastify.register(async (admin) => {
    admin.addHook('preHandler', async (request, reply) => {
      if (request.headers['x-admin-key'] !== 'expert-admin') {
        return reply.code(401).send({ error: 'UNAUTHORIZED_ADMIN' });
      }
    });

    admin.post<{ Body: { sku: string; name: string; stock: number } }>(
      '/items',
      {
        schema: createItemSchema,
        config: {
          rateLimit: { max: 20, timeWindow: '1 minute' },
        },
      },
      async (request, reply) => {
        const item = await fastify.catalogService.create(request.body);

        request.log.info({ sku: item.sku }, 'catalog.created');

        return reply.code(201).send(item);
      },
    );
  });
};
