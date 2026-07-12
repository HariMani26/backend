import { Request, Response } from 'express';

import { sendSuccess } from '@helpers/apiResponse';
import { registrationService } from '@services/registration.service';
import { asyncHandler } from '@utils/asyncHandler';
import { toPublicProfile } from '@utils/serializers';

export const registrationController = {
  submitFull: asyncHandler(async (req: Request, res: Response) => {
    const profile = await registrationService.submitFull(req.user!.id, req.body);
    sendSuccess(res, toPublicProfile(profile), 'Registration submitted successfully', 201);
  }),

  submitQuick: asyncHandler(async (req: Request, res: Response) => {
    const profile = await registrationService.submitQuick(req.user!.id, req.body);
    sendSuccess(res, toPublicProfile(profile), 'Quick registration submitted successfully', 201);
  }),

  getDraft: asyncHandler(async (req: Request, res: Response) => {
    const draft = await registrationService.getDraft(req.user!.id);
    sendSuccess(res, draft, 'Draft retrieved');
  }),

  saveDraft: asyncHandler(async (req: Request, res: Response) => {
    await registrationService.saveDraft(req.user!.id, req.body);
    sendSuccess(res, null, 'Draft saved');
  }),
};
