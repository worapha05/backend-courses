export const publicItemSchema = {
  type: 'object',
  properties: {
    sku: { type: 'string' },
    name: { type: 'string' },
    stock: { type: 'integer' },
  },
} as const;

export const listItemsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        items: { type: 'array', items: publicItemSchema },
      },
    },
  },
} as const;

export const getItemSchema = {
  params: {
    type: 'object',
    required: ['sku'],
    properties: { sku: { type: 'string', minLength: 1 } },
  },
  response: { 200: publicItemSchema },
} as const;

export const createItemSchema = {
  body: {
    type: 'object',
    required: ['sku', 'name', 'stock'],
    additionalProperties: false,
    properties: {
      sku: { type: 'string', minLength: 1, maxLength: 64 },
      name: { type: 'string', minLength: 1, maxLength: 120 },
      stock: { type: 'integer', minimum: 0, maximum: 1_000_000 },
    },
  },
  response: { 201: publicItemSchema },
} as const;

export const purchaseSchema = {
  params: {
    type: 'object',
    required: ['sku'],
    properties: { sku: { type: 'string', minLength: 1 } },
  },
  body: {
    type: 'object',
    required: ['qty'],
    additionalProperties: false,
    properties: {
      qty: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: { 200: publicItemSchema },
} as const;
