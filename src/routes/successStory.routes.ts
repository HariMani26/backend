import { Router } from 'express';
import { successStoryController } from '@controllers/successStory.controller';
import { storyQuerySchema } from '@dto/successStory.dto';
import { apiRateLimiter } from '@middlewares/rateLimiter';
import { validateRequest } from '@middlewares/validateRequest';
import { validateProfileIdParams } from '@validators/profile.validator';

export const successStoryRouter = Router();
successStoryRouter.use(apiRateLimiter);
successStoryRouter.get('/', validateRequest({ query: storyQuerySchema }), successStoryController.list);
successStoryRouter.get('/:id', validateProfileIdParams, successStoryController.detail);