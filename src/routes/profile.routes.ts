import { Router } from 'express';

import { profileController } from '@controllers/profile.controller';
import { authenticate } from '@middlewares/authenticate';
import { validateProfileIdParams } from '@validators/profile.validator';

export const profileRouter = Router();

profileRouter.use(authenticate);

/**
 * @openapi
 * /profiles/me:
 *   get:
 *     summary: Get the caller's own profile
 *     tags: [Profiles]
 *     responses:
 *       200: { description: Profile }
 *       404: { description: Not registered yet }
 */
profileRouter.get('/me', profileController.me);

/**
 * @openapi
 * /profiles/{id}:
 *   get:
 *     summary: Get another member's profile (contact fields redacted unless it's your own profile or you're an admin)
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Profile detail }
 *       404: { description: Not found }
 */
profileRouter.get('/:id', validateProfileIdParams, profileController.getById);
