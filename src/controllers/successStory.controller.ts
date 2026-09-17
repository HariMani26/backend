import { StoryQuery } from '@dto/successStory.dto';
import { sendSuccess } from '@helpers/apiResponse';
import { successStoryService } from '@services/successStory.service';
import { asyncHandler } from '@utils/asyncHandler';

export const successStoryController = {
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, await successStoryService.list(req.query as unknown as StoryQuery), 'Success stories');
  }),
  detail: asyncHandler(async (req, res) => {
    sendSuccess(res, await successStoryService.detail(req.params.id as string), 'Success story');
  }),
};