import { createApp } from './app';
import { connectDatabase } from '@config/db';
import { env } from '@config/env';
import { logger } from '@config/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`WeOur Matrimony API listening on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Swagger docs: http://localhost:${env.PORT}/api-docs`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
