import { Router } from 'express';

import { sendSuccess } from '@helpers/apiResponse';

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness/readiness check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: API is up
 */
healthRouter.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() }, 'Service healthy');
});
