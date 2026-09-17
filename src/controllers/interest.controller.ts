import { sendSuccess } from '@helpers/apiResponse';
import { interestService } from '@services/interest.service';
import { asyncHandler } from '@utils/asyncHandler';

export const interestController = {
  send: asyncHandler(async (req, res) => { sendSuccess(res, await interestService.send(req.user!.id, req.params.id as string), 'Interest sent'); }),
  received: asyncHandler(async (req, res) => { sendSuccess(res, await interestService.received(req.user!.id, Number(req.query.page), Number(req.query.limit)), 'Interests received'); }),
  count: asyncHandler(async (req, res) => { sendSuccess(res, await interestService.count(req.user!.id), 'Interest count'); }),
  read: asyncHandler(async (req, res) => { await interestService.markRead(req.user!.id, req.params.id as string); sendSuccess(res, null, 'Interest read'); }),
};