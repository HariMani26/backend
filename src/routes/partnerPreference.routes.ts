import { Router } from 'express';

import { partnerPreferenceController } from '@controllers/partnerPreference.controller';
import { authenticate } from '@middlewares/authenticate';
import { validatePartnerPreferenceUpdate } from '@validators/partnerPreference.validator';

export const partnerPreferenceRouter = Router();

partnerPreferenceRouter.use(authenticate);

/**
 * @openapi
 * /partner-preferences:
 *   get:
 *     summary: Get the caller's partner preferences (defaults if never set)
 *     tags: [PartnerPreferences]
 *     responses:
 *       200: { description: PartnerPreference }
 *   put:
 *     summary: Create or replace the caller's partner preferences
 *     tags: [PartnerPreferences]
 *     responses:
 *       200: { description: Updated PartnerPreference }
 */
partnerPreferenceRouter.get('/', partnerPreferenceController.get);
partnerPreferenceRouter.put('/', validatePartnerPreferenceUpdate, partnerPreferenceController.update);
