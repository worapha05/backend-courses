import fp from 'fastify-plugin';

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
};

declare module 'fastify' {
  interface FastifyInstance {
    productRepo: Map<string, Product>;
  }
}

export const productStorePlugin = fp(
  async (fastify) => {
    const repo = new Map<string, Product>();

    const seed: Product[] = [
      {
        id: 'p-100',
        name: 'Noise-Cancelling Headphones',
        price: 4590,
        stock: 25,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'p-200',
        name: 'Ultralight Laptop Stand',
        price: 1290,
        stock: 80,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const product of seed) {
      repo.set(product.id, product);
    }

    fastify.decorate('productRepo', repo);
  },
  { name: 'product-store-plugin' },
);
