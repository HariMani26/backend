import { Request, Response } from "express";

import { SearchQuery } from "@dto/search.dto";
import { sendSuccess } from "@helpers/apiResponse";
import { Gender } from "@models/Profile.model";
import { profileService } from "@services/profile.service";
import { searchService } from "@services/search.service";
import { evaluateAccess } from '@services/access.service';
import { asyncHandler } from "@utils/asyncHandler";

function oppositeGender(gender: Gender): Gender {
  return gender === "male" ? "female" : "male";
}

export const searchController = {
  browse: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, ...filters } = req.query as unknown as SearchQuery;
    const result = await searchService.search({ ...filters, publicOnly: true }, page, limit, false);
    sendSuccess(res, result, "Browse profiles");
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as SearchQuery;
    const viewerProfile = await profileService.findByUserId(req.user!.id);

    const gender =
      query.gender ??
      (viewerProfile ? oppositeGender(viewerProfile.gender) : undefined);

    const result = await searchService.search(
      {
        excludeUserId: req.user!.id,
        publicOnly: true,
        name: query.name,
        gender,
        state: query.state,
        district: query.district,
        kulam: query.kulam,
        ageFrom: query.ageFrom,
        ageTo: query.ageTo,
      },
      query.page,
      query.limit,
      evaluateAccess(viewerProfile, req.user!.role).hasFullAccess,
    );

    sendSuccess(res, result, "Search results");
  }),
};
