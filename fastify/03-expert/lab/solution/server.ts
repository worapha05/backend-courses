import Fastify, { LogController } from 'fastify';
import { hardeningPlugin } from './plugins/hardening.js';
import { infraPlugin } from './plugins/infra.js';
import { catalogRoutes } from './modules/catalog-routes.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  logController: new LogController({ disableRequestLogging: true }),
  trustProxy: true,
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: 'array',
      allErrors: false,
      useDefaults: true,
    },
  },
});

await app.register(infraPlugin);
await app.register(hardeningPlugin);
await app.register(catalogRoutes, { prefix: '/api/catalog' });

const port = Number(process.env.PORT ?? 3030);

await app.listen({ port, host: '127.0.0.1' });

app.runtime.registered = true;
app.log.info({ port }, 'service.ready_and_registered');

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'drain.start');

  app.runtime.draining = true;
  app.runtime.registered = false;

  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
