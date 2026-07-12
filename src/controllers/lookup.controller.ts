import { Request, Response } from 'express';

import { sendSuccess } from '@helpers/apiResponse';
import { districtRepository } from '@repositories/district.repository';
import { kulamRepository } from '@repositories/kulam.repository';
import { asyncHandler } from '@utils/asyncHandler';

export const lookupController = {
  districts: asyncHandler(async (_req: Request, res: Response) => {
    const districts = await districtRepository.findAll();
    sendSuccess(res, districts, 'Districts retrieved');
  }),

  kulams: asyncHandler(async (_req: Request, res: Response) => {
    const kulams = await kulamRepository.findAll();
    sendSuccess(res, kulams, 'Kulams retrieved');
  }),
};
