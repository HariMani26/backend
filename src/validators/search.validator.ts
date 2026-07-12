import { searchQuerySchema } from '@dto/search.dto';
import { validateRequest } from '@middlewares/validateRequest';

export const validateSearchQuery = validateRequest({ query: searchQuerySchema });
