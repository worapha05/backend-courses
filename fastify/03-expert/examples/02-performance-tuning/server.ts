import { pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';
import Fastify, { LogController } from 'fastify';
import underPressure from '@fastify/under-pressure';

const pbkdf2Async = promisify(pbkdf2);

const app = Fastify({
  logger: { level: 'warn' },
  logController: new LogController({ disableRequestLogging: true }),
  ajv: {
    customOptions: {
      coerceTypes: 'array',
      removeAdditional: 'all',
      allErrors: false,
      useDefaults: true,
    },
  },
});

await app.register(underPressure, {
  maxEventLoopDelay: 1000,
  maxHeapUsedBytes: 0,
  maxRssBytes: 0,
  retryAfter: 30,
  message: 'Service under pressure',
});

const tokenSchema = {
  body: {
    type: 'object',
    required: ['password'],
    additionalProperties: false,
    properties: {
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        derived: { type: 'string' },
        ms: { type: 'number' },
      },
    },
  },
} as const;

app.post<{ Body: { password: string } }>('/derive', { schema: tokenSchema }, async (request) => {
  const started = performance.now();
  const buf = await pbkdf2Async(request.body.password, 'bootcamp-salt', 100_000, 32, 'sha512');

  return {
    derived: buf.toString('hex'),
    ms: Math.round(performance.now() - started),
  };
});

app.get(
  '/ping',
  {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: { pong: { type: 'boolean' } },
        },
      },
    },
  },
  async () => ({ pong: true }),
);

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 3007);

await app.listen({ port, host: '127.0.0.1' });
app.log.warn(`listening on ${port} — try POST /derive and GET /ping`);
