import { Request, Response } from "express";

import { sendSuccess } from "@helpers/apiResponse";
import { districtService } from "@services/district.service";
import { kulamService } from "@services/kulam.service";
import { asyncHandler } from "@utils/asyncHandler";

export const lookupController = {
  districts: asyncHandler(async (_req: Request, res: Response) => {
    const districts = await districtService.findAll();
    sendSuccess(res, districts, "Districts retrieved");
  }),

  kulams: asyncHandler(async (_req: Request, res: Response) => {
    const kulams = await kulamService.findAll();
    sendSuccess(res, kulams, "Kulams retrieved");
  }),
};
