import { profileIdParamsSchema } from '@dto/profile.dto';
import { validateRequest } from '@middlewares/validateRequest';

export const validateProfileIdParams = validateRequest({ params: profileIdParamsSchema });
