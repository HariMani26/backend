import { Router } from 'express';

import { registrationController } from '@controllers/registration.controller';
import { authenticate } from '@middlewares/authenticate';
import { validateFullRegistration, validateQuickRegistration, validateRegistrationDraft } from '@validators/registration.validator';

export const registrationRouter = Router();

registrationRouter.use(authenticate);

/**
 * @openapi
 * /registrations:
 *   post:
 *     summary: Submit the full 6-step RegistrationWizard payload, creating the caller's Profile + PartnerPreference
 *     tags: [Registrations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/FullRegistrationDto' }
 *     responses:
 *       201: { description: Profile created }
 */
registrationRouter.post('/', validateFullRegistration, registrationController.submitFull);

/**
 * @openapi
 * /registrations/quick:
 *   post:
 *     summary: Submit a registrar-filled quick registration (admin completes remaining details later)
 *     tags: [Registrations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/QuickRegistrationDto' }
 *     responses:
 *       201: { description: Profile created }
 */
registrationRouter.post('/quick', validateQuickRegistration, registrationController.submitQuick);

/**
 * @openapi
 * /registrations/draft:
 *   get:
 *     summary: Get the caller's autosaved wizard draft, if any
 *     tags: [Registrations]
 *     responses:
 *       200: { description: Draft data (empty object if none saved) }
 *   patch:
 *     summary: Autosave the caller's wizard draft (replaces the stored draft with this payload)
 *     tags: [Registrations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegistrationDraftDto' }
 *     responses:
 *       200: { description: Draft saved }
 */
registrationRouter.get('/draft', registrationController.getDraft);
registrationRouter.patch('/draft', validateRegistrationDraft, registrationController.saveDraft);
