import cors from 'cors';
import express, { Application } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
// @ts-expect-error — xss-clean ships no type declarations
import xss from 'xss-clean';

import { env } from '@config/env';
import { globalErrorHandler, notFoundHandler } from '@middlewares/errorHandler';
import { apiRateLimiter } from '@middlewares/rateLimiter';
import { apiRouter } from '@routes/index';
import { swaggerSpec } from '@swagger/swagger';

export function createApp(): Application {
  const app = express();
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

        if (allowedOrigins.includes(origin) || isLocalhostOrigin) {
          callback(null, true);
          return;
        }

        callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(mongoSanitize());
  app.use(xss());
  app.use(apiRateLimiter);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(env.API_BASE_PATH, apiRouter);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
