import Fastify from 'fastify';

const app = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: 'array',
      allErrors: false,
      useDefaults: true,
    },
  },
});

type Order = {
  id: string;
  sku: string;
  qty: number;
  status: 'pending' | 'paid';
  internalSecret: string;
};

const orders: Order[] = [
  {
    id: 'ord_1',
    sku: 'SKU-1',
    qty: 1,
    status: 'pending',
    internalSecret: 'should-never-leak',
  },
];

const listOrdersSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      status: { type: 'string', enum: ['pending', 'paid'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sku: { type: 'string' },
              qty: { type: 'integer' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

const createOrderSchema = {
  headers: {
    type: 'object',
    properties: {
      'x-request-source': { type: 'string', enum: ['web', 'mobile', 'partner'] },
    },
  },
  body: {
    type: 'object',
    required: ['sku', 'qty'],
    additionalProperties: false,
    properties: {
      sku: { type: 'string', minLength: 1, maxLength: 64 },
      qty: { type: 'integer', minimum: 1, maximum: 999 },
      note: { type: 'string', maxLength: 200 },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        sku: { type: 'string' },
        qty: { type: 'integer' },
        status: { type: 'string' },
      },
    },
  },
} as const;

app.get<{ Querystring: { limit?: number; status?: string } }>(
  '/orders',
  { schema: listOrdersSchema },
  async (request) => {
    const { limit = 10, status } = request.query;
    const filtered = status ? orders.filter((o) => o.status === status) : orders;

    return { items: filtered.slice(0, limit) };
  },
);

app.post<{
  Body: { sku: string; qty: number; note?: string };
  Headers: { 'x-request-source'?: string };
}>('/orders', { schema: createOrderSchema }, async (request, reply) => {
  const order: Order = {
    id: `ord_${orders.length + 1}`,
    sku: request.body.sku,
    qty: request.body.qty,
    status: 'pending',
    internalSecret: 'should-never-leak',
  };

  orders.push(order);
  request.log.info(
    { orderId: order.id, source: request.headers['x-request-source'] },
    'order.created',
  );

  return reply.code(201).send(order);
});

app.get<{ Params: { id: string } }>(
  '/orders/:id',
  {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^ord_[0-9]+$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sku: { type: 'string' },
            qty: { type: 'integer' },
            status: { type: 'string' },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const order = orders.find((o) => o.id === request.params.id);

    if (!order) {
      return reply.code(404).send({ error: 'NOT_FOUND' });
    }

    return order;
  },
);

const port = Number(process.env.PORT ?? 3003);

await app.listen({ port, host: '127.0.0.1' });
