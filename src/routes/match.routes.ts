import { Router } from 'express';

import { matchController } from '@controllers/match.controller';
import { authenticate } from '@middlewares/authenticate';
import { validateScoreParams, validateTopMatchesQuery } from '@validators/match.validator';

export const matchRouter = Router();

matchRouter.use(authenticate);

/**
 * @openapi
 * /matches/top:
 *   get:
 *     summary: Top compatibility-ranked matches for the caller (opposite gender, excludes self)
 *     tags: [Matches]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: 'ProfileSummary[] each with an attached matchScore' }
 */
matchRouter.get('/top', validateTopMatchesQuery, matchController.top);

/**
 * @openapi
 * /matches/score/{profileId}:
 *   get:
 *     summary: Compatibility score between the caller and the given profile
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: MatchScore }
 */
matchRouter.get('/score/:profileId', validateScoreParams, matchController.score);
