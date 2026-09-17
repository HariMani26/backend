import { Router } from 'express';
import { z } from 'zod';
import { interestController } from '@controllers/interest.controller';
import { authenticate } from '@middlewares/authenticate';
import { apiRateLimiter } from '@middlewares/rateLimiter';
import { validateRequest } from '@middlewares/validateRequest';
import { validateProfileIdParams } from '@validators/profile.validator';

export const interestRouter = Router();
interestRouter.use(authenticate, apiRateLimiter);
interestRouter.get('/count', interestController.count);
interestRouter.get('/', validateRequest({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }) }), interestController.received);
interestRouter.post('/:id', validateProfileIdParams, interestController.send);
interestRouter.patch('/:id/read', validateProfileIdParams, interestController.read);