import { Router } from 'express';

import { searchController } from '@controllers/search.controller';
import { authenticate } from '@middlewares/authenticate';
import { validateSearchQuery } from '@validators/search.validator';

export const searchRouter = Router();

searchRouter.use(authenticate);

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Browse/filter profiles (opposite gender by default, excludes self)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: kulam
 *         schema: { type: string }
 *       - in: query
 *         name: ageFrom
 *         schema: { type: integer }
 *       - in: query
 *         name: ageTo
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: 'Paginated profile summaries: { items, total, page, limit }' }
 */
searchRouter.get('/', validateSearchQuery, searchController.search);
