import { Request, Response } from "express";

import { sendSuccess } from "@helpers/apiResponse";
import { partnerPreferenceService } from "@services/partnerPreference.service";
import { asyncHandler } from "@utils/asyncHandler";

const DEFAULTS = {
  ageMin: 21,
  ageMax: 31,
  preferredKulams: [] as string[],
  preferredDistricts: [] as string[],
  preferredEducation: [] as string[],
  preferredJobs: [] as string[],
};

export const partnerPreferenceController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const preference = await partnerPreferenceService.findByUserId(
      req.user!.id,
    );
    sendSuccess(res, preference ?? DEFAULTS, "Partner preferences");
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const updated = await partnerPreferenceService.upsertByUserId(
      req.user!.id,
      req.body,
    );
    sendSuccess(res, updated, "Partner preferences updated");
  }),
};
