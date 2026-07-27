import { randomUUID } from 'node:crypto';
import fp from 'fastify-plugin';

export type OrderStatus = 'pending' | 'paid' | 'cancelled';

export type Order = {
  id: string;
  sku: string;
  qty: number;
  status: OrderStatus;
  costPrice: number;
  createdAt: string;
};

export type OrderRepo = {
  list: (opts: { limit: number; status?: OrderStatus }) => Promise<Order[]>;
  get: (id: string) => Promise<Order | null>;
  create: (input: { sku: string; qty: number }) => Promise<Order>;
  updateStatus: (id: string, status: OrderStatus) => Promise<Order | null>;
  end: () => Promise<void>;
  isOpen: boolean;
};

function createOrderRepo(): OrderRepo {
  let open = true;
  const store = new Map<string, Order>([
    [
      'ord_seed',
      {
        id: 'ord_seed',
        sku: 'SKU-100',
        qty: 2,
        status: 'pending',
        costPrice: 199,
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  const ensureOpen = () => {
    if (!open) {
      throw new Error('DB pool closed');
    }
  };

  const delay = () => new Promise((r) => setTimeout(r, 3));

  return {
    get isOpen() {
      return open;
    },

    async list({ limit, status }) {
      ensureOpen();
      await delay();

      let items = [...store.values()];
      if (status) {
        items = items.filter((o) => o.status === status);
      }

      return items.slice(0, limit);
    },

    async get(id) {
      ensureOpen();
      await delay();

      return store.get(id) ?? null;
    },

    async create({ sku, qty }) {
      ensureOpen();
      await delay();

      const order: Order = {
        id: randomUUID(),
        sku,
        qty,
        status: 'pending',
        costPrice: Math.round(qty * 50),
        createdAt: new Date().toISOString(),
      };

      store.set(order.id, order);

      return order;
    },

    async updateStatus(id, status) {
      ensureOpen();
      await delay();

      const order = store.get(id);

      if (!order) {
        return null;
      }

      const updated = { ...order, status };
      store.set(id, updated);

      return updated;
    },

    async end() {
      open = false;
      store.clear();
    },
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    db: OrderRepo;
  }
}

export const dbPlugin = fp(
  async (fastify) => {
    const db = createOrderRepo();

    fastify.decorate('db', db);

    fastify.addHook('onClose', async (instance) => {
      instance.log.info('db.onClose');
      await db.end();
    });
  },
  { name: 'db-plugin' },
);
