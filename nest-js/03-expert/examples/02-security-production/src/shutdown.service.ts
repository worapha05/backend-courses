import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';

@Injectable()
export class ShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(ShutdownService.name);
  isShuttingDown = false;

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.isShuttingDown = true;
    this.logger.warn(`Received ${signal}. Draining requests...`);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    this.logger.log('Shutdown complete');
  }
}
