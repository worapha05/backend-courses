import type { FastifyPluginAsync } from 'fastify';
import type { OrderStatus } from '../plugins/db.js';
import {
  createOrderSchema,
  getOrderSchema,
  listOrdersSchema,
  patchStatusSchema,
} from '../schemas/order.js';

export const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.headers['x-api-key'] !== 'bootcamp-key') {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  });

  fastify.get<{ Querystring: { limit?: number; status?: OrderStatus } }>(
    '/orders',
    { schema: listOrdersSchema },
    async (request) => {
      const limit = request.query.limit ?? 20;
      const items = await fastify.db.list({ limit, status: request.query.status });

      return { items };
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/orders/:id',
    { schema: getOrderSchema },
    async (request, reply) => {
      const order = await fastify.db.get(request.params.id);

      if (!order) {
        return reply.code(404).send({ error: 'NOT_FOUND' });
      }

      return order;
    },
  );

  fastify.post<{ Body: { sku: string; qty: number } }>(
    '/orders',
    { schema: createOrderSchema },
    async (request, reply) => {
      const order = await fastify.db.create(request.body);

      request.log.info({ orderId: order.id, sku: order.sku }, 'order.created');

      return reply.code(201).send(order);
    },
  );

  fastify.patch<{ Params: { id: string }; Body: { status: OrderStatus } }>(
    '/orders/:id/status',
    { schema: patchStatusSchema },
    async (request, reply) => {
      const order = await fastify.db.updateStatus(request.params.id, request.body.status);

      if (!order) {
        return reply.code(404).send({ error: 'NOT_FOUND' });
      }

      request.log.info({ orderId: order.id, status: order.status }, 'order.status_updated');

      return order;
    },
  );
};
