import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    appConfig: {
      serviceName: string;
      version: string;
    };
  }
}

export const configPlugin = fp(
  async (fastify) => {
    fastify.decorate('appConfig', {
      serviceName: 'catalog-service',
      version: '1.0.0',
    });
  },
  { name: 'config-plugin' },
);
