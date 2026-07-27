import fp from 'fastify-plugin';
import { createMemoryCatalogRepo } from '../adapters/memory-catalog-repo.js';
import { createCatalogService, type CatalogService } from '../domain/catalog-service.js';
import type { CatalogRepository } from '../ports/catalog-repository.js';

export type RuntimeState = {
  draining: boolean;
  registered: boolean;
};

declare module 'fastify' {
  interface FastifyInstance {
    catalogRepo: CatalogRepository;
    catalogService: CatalogService;
    runtime: RuntimeState;
  }
}

export const infraPlugin = fp(
  async (fastify) => {
    const catalogRepo = createMemoryCatalogRepo();
    const catalogService = createCatalogService(catalogRepo);
    const runtime: RuntimeState = { draining: false, registered: false };

    fastify.decorate('catalogRepo', catalogRepo);
    fastify.decorate('catalogService', catalogService);
    fastify.decorate('runtime', runtime);

    fastify.addHook('onClose', async () => {
      await catalogRepo.close();
    });
  },
  { name: 'infra-plugin' },
);
