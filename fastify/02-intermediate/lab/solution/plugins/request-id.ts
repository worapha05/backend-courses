import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';

export const requestIdPlugin = fp(
  async (fastify) => {
    fastify.addHook('onRequest', async (request, reply) => {
      const incoming = request.headers['x-request-id'];
      const requestId =
        typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

      reply.header('x-request-id', requestId);
      request.log = request.log.child({ requestId });
    });
  },
  { name: 'request-id-plugin' },
);
