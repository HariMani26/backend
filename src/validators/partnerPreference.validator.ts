import { partnerPreferenceSchema } from '@dto/registration.dto';
import { validateRequest } from '@middlewares/validateRequest';

export const validatePartnerPreferenceUpdate = validateRequest({ body: partnerPreferenceSchema });
