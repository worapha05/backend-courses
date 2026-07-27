import Fastify from 'fastify';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  },
});

app.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
}));

app.get<{ Params: { name: string } }>('/hello/:name', async (request, reply) => {
  const { name } = request.params;

  request.log.info({ name }, 'greeting');

  return reply.code(200).send({ message: `Hello, ${name}!` });
});

app.get<{ Querystring: { limit?: string } }>('/items', async (request) => {
  const limit = Number(request.query.limit ?? 10);

  return {
    items: Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
      id: String(i + 1),
      title: `Item ${i + 1}`,
    })),
  };
});

app.route<{ Body: { msg: string } }>({
  method: 'POST',
  url: '/echo',
  handler: async (request, reply) => {
    const { msg } = request.body ?? { msg: '' };

    return reply.code(201).send({ echoed: msg, receivedAt: new Date().toISOString() });
  },
});

app.get('/redirect-demo', async (_request, reply) => {
  return reply.redirect('/health');
});

const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port, host: '127.0.0.1' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
