import { Router } from 'express';

import { profileController } from '@controllers/profile.controller';
import { searchController } from '@controllers/search.controller';
import { apiRateLimiter } from '@middlewares/rateLimiter';
import { validateProfileIdParams } from '@validators/profile.validator';
import { validateSearchQuery } from '@validators/search.validator';

export const browseRouter = Router();

browseRouter.use(apiRateLimiter);
browseRouter.get('/', validateSearchQuery, searchController.browse);
browseRouter.get('/:id', validateProfileIdParams, profileController.browse);