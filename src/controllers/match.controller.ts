import { Request, Response } from 'express';

import { ScoreParams, TopMatchesQuery } from '@dto/match.dto';
import { sendSuccess } from '@helpers/apiResponse';
import { matchService } from '@services/match.service';
import { asyncHandler } from '@utils/asyncHandler';

export const matchController = {
  top: asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as TopMatchesQuery;
    const matches = await matchService.topMatches(req.user!.id, limit);
    sendSuccess(res, matches, 'Top matches');
  }),

  score: asyncHandler(async (req: Request, res: Response) => {
    const { profileId } = req.params as unknown as ScoreParams;
    const matchScore = await matchService.scoreAgainst(req.user!.id, profileId);
    sendSuccess(res, matchScore, 'Compatibility score');
  }),
};
