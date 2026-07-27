import Fastify from 'fastify';
import fp from 'fastify-plugin';

type UserRow = { id: string; email: string; name: string };

class FakePool {
  #open = true;
  #users = new Map<string, UserRow>([
    ['u1', { id: 'u1', email: 'ada@example.com', name: 'Ada' }],
    ['u2', { id: 'u2', email: 'linus@example.com', name: 'Linus' }],
  ]);

  async query(sql: string, params: string[] = []): Promise<UserRow[]> {
    if (!this.#open) {
      throw new Error('Pool is closed');
    }

    await new Promise((r) => setTimeout(r, 5));

    if (sql.startsWith('SELECT_ALL')) {
      return [...this.#users.values()];
    }

    if (sql.startsWith('SELECT_ONE')) {
      const row = this.#users.get(params[0] ?? '');

      return row ? [row] : [];
    }

    return [];
  }

  async end() {
    this.#open = false;
  }

  get isOpen() {
    return this.#open;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    userDb: FakePool;
  }
}

const dbPlugin = fp(
  async (fastify) => {
    const pool = new FakePool();

    fastify.decorate('userDb', pool);

    fastify.addHook('onClose', async (instance) => {
      instance.log.info('closing db pool');
      await pool.end();
    });
  },
  { name: 'user-db-plugin' },
);

const app = Fastify({
  logger: {
    level: 'info',
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
  },
});

await app.register(dbPlugin);

app.get('/users', async (request) => {
  const users = await app.userDb.query('SELECT_ALL');

  request.log.info({ count: users.length }, 'users.listed');

  return { items: users };
});

app.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
  const rows = await app.userDb.query('SELECT_ONE', [request.params.id]);
  const user = rows[0];

  if (!user) {
    request.log.warn({ userId: request.params.id }, 'users.not_found');

    return reply.code(404).send({ error: 'NOT_FOUND' });
  }

  return user;
});

app.get('/health', async () => ({
  status: 'ok',
  dbOpen: app.userDb.isOpen,
}));

const port = Number(process.env.PORT ?? 3005);

await app.listen({ port, host: '127.0.0.1' });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutdown.started');

  try {
    await app.close();
    app.log.info('shutdown.complete');
    process.exit(0);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
