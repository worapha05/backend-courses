import type { OrderStatus } from '../plugins/db.js';

export const orderPublicSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    sku: { type: 'string' },
    qty: { type: 'integer' },
    status: { type: 'string' },
    createdAt: { type: 'string' },
  },
} as const;

export const listOrdersSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      status: { type: 'string', enum: ['pending', 'paid', 'cancelled'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        items: { type: 'array', items: orderPublicSchema },
      },
    },
  },
} as const;

export const getOrderSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  response: {
    200: orderPublicSchema,
  },
} as const;

export const createOrderSchema = {
  body: {
    type: 'object',
    required: ['sku', 'qty'],
    additionalProperties: false,
    properties: {
      sku: { type: 'string', minLength: 1, maxLength: 64 },
      qty: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
  response: {
    201: orderPublicSchema,
  },
} as const;

export const patchStatusSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  body: {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['pending', 'paid', 'cancelled'] satisfies OrderStatus[] },
    },
  },
  response: {
    200: orderPublicSchema,
  },
} as const;
