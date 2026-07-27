import Fastify, { type FastifyError, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// --- Domain ---

export type InventoryItem = {
  sku: string;
  name: string;
  quantity: number;
};

// --- Ports ---

export type InventoryRepository = {
  list: () => Promise<InventoryItem[]>;
  reserve: (sku: string, qty: number) => Promise<InventoryItem>;
};

export type InventoryService = {
  listItems: () => Promise<InventoryItem[]>;
  reserveStock: (sku: string, qty: number) => Promise<InventoryItem>;
};

// --- Domain service (ไม่รู้จัก Fastify) ---

export function createInventoryService(repo: InventoryRepository): InventoryService {
  return {
    listItems: () => repo.list(),

    async reserveStock(sku, qty) {
      if (qty <= 0) {
        throw Object.assign(new Error('INVALID_QTY'), { statusCode: 400 });
      }

      return repo.reserve(sku, qty);
    },
  };
}

// --- Adapter: in-memory repo ---

function createMemoryInventoryRepo(): InventoryRepository {
  const items = new Map<string, InventoryItem>([
    ['SKU-1', { sku: 'SKU-1', name: 'Studio Mic', quantity: 12 }],
    ['SKU-2', { sku: 'SKU-2', name: 'Capture Card', quantity: 4 }],
  ]);

  return {
    async list() {
      return [...items.values()];
    },

    async reserve(sku, qty) {
      const item = items.get(sku);

      if (!item) {
        throw Object.assign(new Error('SKU_NOT_FOUND'), { statusCode: 404 });
      }

      if (item.quantity < qty) {
        throw Object.assign(new Error('INSUFFICIENT_STOCK'), { statusCode: 409 });
      }

      const updated = { ...item, quantity: item.quantity - qty };
      items.set(sku, updated);

      return updated;
    },
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    inventoryRepo: InventoryRepository;
    inventoryService: InventoryService;
  }
}

// Infra port wiring (fp)

const inventoryInfraPlugin = fp(
  async (fastify) => {
    const repo = createMemoryInventoryRepo();
    const service = createInventoryService(repo);

    fastify.decorate('inventoryRepo', repo);
    fastify.decorate('inventoryService', service);
  },
  { name: 'inventory-infra' },
);

// HTTP adapter module (encapsulated)

const inventoryHttpModule: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.headers['x-service-token'] !== 'inventory-token') {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
  });

  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sku: { type: 'string' },
                    name: { type: 'string' },
                    quantity: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async () => ({ items: await fastify.inventoryService.listItems() }),
  );

  fastify.post<{ Body: { sku: string; qty: number } }>(
    '/reserve',
    {
      schema: {
        body: {
          type: 'object',
          required: ['sku', 'qty'],
          additionalProperties: false,
          properties: {
            sku: { type: 'string' },
            qty: { type: 'integer', minimum: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sku: { type: 'string' },
              name: { type: 'string' },
              quantity: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request) => {
      return fastify.inventoryService.reserveStock(request.body.sku, request.body.qty);
    },
  );
};

const app = Fastify({ logger: true });

app.setErrorHandler<FastifyError>((error, request, reply) => {
  request.log.warn({ err: error }, 'inventory.error');

  const status = error.statusCode ?? 500;

  return reply.code(status).send({ error: error.message });
});

await app.register(inventoryInfraPlugin);
await app.register(inventoryHttpModule, { prefix: '/api/inventory' });

app.get('/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT ?? 3006);

await app.listen({ port, host: '127.0.0.1' });
