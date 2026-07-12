import { fullRegistrationSchema, quickRegistrationSchema, registrationDraftSchema } from '@dto/registration.dto';
import { validateRequest } from '@middlewares/validateRequest';

export const validateFullRegistration = validateRequest({ body: fullRegistrationSchema });
export const validateQuickRegistration = validateRequest({ body: quickRegistrationSchema });
export const validateRegistrationDraft = validateRequest({ body: registrationDraftSchema });
