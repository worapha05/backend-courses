import Fastify from 'fastify';

const app = Fastify({
  logger: {
    level: 'info',
    transport: { target: 'pino-pretty', options: { colorize: true } },
  },
});

type Timings = {
  marks: string[];
};

declare module 'fastify' {
  interface FastifyRequest {
    timings: Timings;
  }
}

app.decorateRequest('timings', null as unknown as Timings);

app.addHook('onRequest', async (request) => {
  request.timings = { marks: ['onRequest'] };
});

app.addHook('preValidation', async (request) => {
  request.timings.marks.push('preValidation');
});

app.addHook('preHandler', async (request) => {
  request.timings.marks.push('preHandler');
});

app.addHook('onSend', async (request, _reply, payload) => {
  request.timings.marks.push('onSend');

  return payload;
});

app.addHook('onResponse', async (request, reply) => {
  request.timings.marks.push('onResponse');
  request.log.info(
    {
      marks: request.timings.marks,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    },
    'lifecycle.complete',
  );
});

await app.register(
  async (admin) => {
    admin.addHook('preHandler', async (request, reply) => {
      const key = request.headers['x-admin-key'];

      if (key !== 'secret') {
        return reply.code(401).send({ error: 'UNAUTHORIZED' });
      }

      request.timings.marks.push('admin.preHandler');
    });

    admin.get('/stats', async (request) => ({
      ok: true,
      marks: request.timings.marks,
    }));
  },
  { prefix: '/admin' },
);

app.post<{ Body: { ping?: string } }>(
  '/echo',
  {
    schema: {
      body: {
        type: 'object',
        properties: { ping: { type: 'string' } },
        additionalProperties: false,
      },
    },
    preHandler: async (request) => {
      request.timings.marks.push('route.preHandler');
    },
  },
  async (request) => {
    request.timings.marks.push('handler');

    return { pong: request.body?.ping ?? 'empty', marks: request.timings.marks };
  },
);

const port = Number(process.env.PORT ?? 3004);

await app.listen({ port, host: '127.0.0.1' });
app.log.info('Try: POST /echo and GET /admin/stats with header x-admin-key: secret');
