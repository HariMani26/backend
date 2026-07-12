import { scoreParamsSchema, topMatchesQuerySchema } from '@dto/match.dto';
import { validateRequest } from '@middlewares/validateRequest';

export const validateTopMatchesQuery = validateRequest({ query: topMatchesQuerySchema });
export const validateScoreParams = validateRequest({ params: scoreParamsSchema });
