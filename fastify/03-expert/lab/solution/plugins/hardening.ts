import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyError, FastifyPluginAsync } from 'fastify';

export const hardeningPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(cors, {
    origin: ['http://localhost:5173', 'https://app.example.com'],
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  fastify.setErrorHandler<FastifyError>((error, request, reply) => {
    request.log.error({ err: error }, 'request.failed');

    if (error.validation) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Request failed schema validation',
      });
    }

    const statusCode = error.statusCode ?? 500;

    return reply.code(statusCode).send({
      error: statusCode >= 500 ? 'INTERNAL_ERROR' : error.message,
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'NOT_FOUND', path: request.url });
  });

  fastify.get('/health/live', async () => ({ status: 'alive' }));

  fastify.get('/health/ready', async (_request, reply) => {
    const { runtime, catalogRepo } = fastify;

    if (runtime.draining || !runtime.registered || !catalogRepo.isReady()) {
      return reply.code(503).send({ status: 'not_ready' });
    }

    return { status: 'ready' };
  });
};
