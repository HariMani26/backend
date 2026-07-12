import { fileIdParamsSchema } from '@dto/upload.dto';
import { validateRequest } from '@middlewares/validateRequest';

export const validateFileIdParams = validateRequest({ params: fileIdParamsSchema });
