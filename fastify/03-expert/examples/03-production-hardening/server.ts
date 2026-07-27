import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import session from '@fastify/session';

type RegistryState = {
  registered: boolean;
  draining: boolean;
};

const registry: RegistryState = {
  registered: false,
  draining: false,
};

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await app.register(helmet, {
  contentSecurityPolicy: false,
});

await app.register(cors, {
  origin: ['http://localhost:5173', 'https://app.example.com'],
  credentials: true,
});

await app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
});

await app.register(cookie);
await app.register(session, {
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me-to-a-long-random-string',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  },
});

let dbReady = true;

app.setErrorHandler<FastifyError>((error, request, reply) => {
  request.log.error({ err: error }, 'request.failed');

  if (error.validation) {
    return reply.code(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
    });
  }

  const statusCode = error.statusCode ?? 500;

  return reply.code(statusCode).send({
    error: statusCode >= 500 ? 'INTERNAL_ERROR' : error.message,
  });
});

app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: 'NOT_FOUND', path: request.url });
});

app.get('/health/live', async () => ({ status: 'alive' }));

app.get('/health/ready', async (_request, reply) => {
  if (!dbReady || registry.draining || !registry.registered) {
    return reply.code(503).send({ status: 'not_ready' });
  }

  return { status: 'ready' };
});

app.post(
  '/login',
  {
    schema: {
      body: {
        type: 'object',
        required: ['username'],
        additionalProperties: false,
        properties: {
          username: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            user: { type: 'string' },
          },
        },
      },
    },
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  },
  async (request, reply) => {
    const { username } = request.body as { username: string };

    request.session.user = username;

    return { ok: true, user: username };
  },
);

app.get('/me', async (request, reply) => {
  const user = request.session.user;

  if (!user) {
    return reply.code(401).send({ error: 'UNAUTHENTICATED' });
  }

  return { user };
});

declare module '@fastify/session' {
  interface FastifySessionObject {
    user?: string;
  }
}

const port = Number(process.env.PORT ?? 3008);

await app.listen({ port, host: '127.0.0.1' });

registry.registered = true;
app.log.info('service.registered_with_registry');

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'drain.start');

  registry.draining = true;
  registry.registered = false;
  dbReady = false;

  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
