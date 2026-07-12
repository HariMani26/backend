import { Router } from 'express';

import { lookupController } from '@controllers/lookup.controller';

export const lookupRouter = Router();

/**
 * @openapi
 * /lookups/districts:
 *   get:
 *     summary: List all Tamil Nadu districts (bilingual labels), for registration/search dropdowns
 *     tags: [Lookups]
 *     security: []
 *     responses:
 *       200: { description: Districts }
 */
lookupRouter.get('/districts', lookupController.districts);

/**
 * @openapi
 * /lookups/kulams:
 *   get:
 *     summary: List the canonical 12-Kulam reference list (bilingual labels), for registration/search dropdowns
 *     tags: [Lookups]
 *     security: []
 *     responses:
 *       200: { description: Kulams }
 */
lookupRouter.get('/kulams', lookupController.kulams);
