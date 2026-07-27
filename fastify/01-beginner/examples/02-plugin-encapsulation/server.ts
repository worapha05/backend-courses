import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    shopConfig: { shopName: string; currency: string };
    catalogStore: Map<string, { id: string; name: string; price: number }>;
  }
}

const configPlugin = fp(
  async (fastify) => {
    fastify.decorate('shopConfig', {
      shopName: 'Zero Hero Mart',
      currency: 'THB',
    });
  },
  { name: 'config-plugin' },
);

const catalogPlugin: FastifyPluginAsync = async (fastify) => {
  const store = new Map<string, { id: string; name: string; price: number }>([
    ['1', { id: '1', name: 'Mechanical Keyboard', price: 3200 }],
    ['2', { id: '2', name: 'USB-C Hub', price: 890 }],
  ]);

  fastify.decorate('catalogStore', store);

  fastify.get('/products', async () => ({
    shop: fastify.shopConfig.shopName,
    currency: fastify.shopConfig.currency,
    products: [...store.values()],
  }));

  fastify.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const product = store.get(request.params.id);

    if (!product) {
      return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND' });
    }

    return product;
  });
};

const checkoutPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { productId: string; qty: number } }>(
    '/checkout',
    async (request, reply) => {
      const { currency, shopName } = fastify.shopConfig;
      const hasCatalog = typeof (fastify as FastifyInstance).catalogStore !== 'undefined';

      return reply.code(201).send({
        shopName,
        currency,
        productId: request.body.productId,
        qty: request.body.qty,
        note: hasCatalog
          ? 'UNEXPECTED: catalogStore leaked across plugins'
          : 'Encapsulation OK: catalogStore is not visible here',
      });
    },
  );
};

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

await app.register(configPlugin);
await app.register(catalogPlugin, { prefix: '/api/catalog' });
await app.register(checkoutPlugin, { prefix: '/api' });

app.get('/debug/context', async () => ({
  hasConfigOnRoot: typeof app.shopConfig !== 'undefined',
  hasCatalogOnRoot: typeof (app as FastifyInstance).catalogStore !== 'undefined',
}));

const port = Number(process.env.PORT ?? 3002);

try {
  await app.listen({ port, host: '127.0.0.1' });
  app.log.info('Try: GET /api/catalog/products , POST /api/checkout , GET /debug/context');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
