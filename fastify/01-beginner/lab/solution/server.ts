import Fastify from 'fastify';
import { configPlugin } from './plugins/config.js';
import { productStorePlugin } from './plugins/product-store.js';
import { productsRoutes } from './routes/products.js';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  },
});

await app.register(configPlugin);
await app.register(productStorePlugin);

app.get('/health', async () => ({
  status: 'ok',
  service: app.appConfig.serviceName,
  version: app.appConfig.version,
}));

await app.register(productsRoutes, { prefix: '/api/v1' });

const port = Number(process.env.PORT ?? 3010);

try {
  await app.listen({ port, host: '127.0.0.1' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
