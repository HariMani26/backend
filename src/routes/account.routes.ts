import { Router } from 'express';
import { accountController } from '@controllers/account.controller';
import { accountPreferencesSchema, changePasswordSchema, deleteAccountSchema, marriageReportSchema } from '@dto/account.dto';
import { authenticate } from '@middlewares/authenticate';
import { authRateLimiter } from '@middlewares/rateLimiter';
import { validateRequest } from '@middlewares/validateRequest';

export const accountRouter = Router();
accountRouter.use(authenticate);
accountRouter.get('/settings', accountController.get);
accountRouter.put('/settings', validateRequest({ body: accountPreferencesSchema }), accountController.save);
accountRouter.post('/password', authRateLimiter, validateRequest({ body: changePasswordSchema }), accountController.password);
accountRouter.post('/marriage', validateRequest({ body: marriageReportSchema }), accountController.marriage);
accountRouter.post('/delete/request', authRateLimiter, accountController.requestDeletion);
accountRouter.post('/delete', authRateLimiter, validateRequest({ body: deleteAccountSchema }), accountController.delete);