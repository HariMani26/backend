import { Router } from 'express';

import { authRouter } from './auth.routes';
import { browseRouter } from './browse.routes';
import { successStoryRouter } from './successStory.routes';
import { accountRouter } from './account.routes';
import { interestRouter } from './interest.routes';
import { paymentRouter } from './payment.routes';
import { adminRouter } from './admin.routes';
import { chatRouter } from './chat.routes';
import { adminService } from '@services/admin.service';
import { asyncHandler } from '@utils/asyncHandler';
import { sendSuccess } from '@helpers/apiResponse';
import { healthRouter } from './health.routes';
import { lookupRouter } from './lookup.routes';
import { matchRouter } from './match.routes';
import { partnerPreferenceRouter } from './partnerPreference.routes';
import { profileRouter } from './profile.routes';
import { registrationRouter } from './registration.routes';
import { searchRouter } from './search.routes';
import { uploadRouter } from './upload.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/browse', browseRouter);
apiRouter.use('/success-stories', successStoryRouter);
apiRouter.use('/account', accountRouter);
apiRouter.use('/interests', interestRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/conversations', chatRouter);
apiRouter.get('/platform', asyncHandler(async (_req, res) => { sendSuccess(res, await adminService.settings(), 'Platform information'); }));
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/registrations', registrationRouter);
apiRouter.use('/profiles', profileRouter);
apiRouter.use('/lookups', lookupRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/matches', matchRouter);
apiRouter.use('/partner-preferences', partnerPreferenceRouter);

// Milestone 3 (next): apiRouter.use('/payments', paymentRouter); apiRouter.use('/subscriptions', subscriptionRouter); ...
