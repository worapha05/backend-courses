import Fastify from 'fastify';
import { dbPlugin } from './plugins/db.js';
import { requestIdPlugin } from './plugins/request-id.js';
import { ordersRoutes } from './routes/orders.js';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  },
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: 'array',
      useDefaults: true,
    },
  },
});

await app.register(requestIdPlugin);
await app.register(dbPlugin);

app.get('/health', async () => ({
  status: 'ok',
  dbOpen: app.db.isOpen,
}));

await app.register(ordersRoutes, { prefix: '/api' });

const port = Number(process.env.PORT ?? 3020);

await app.listen({ port, host: '127.0.0.1' });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutdown.started');

  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
