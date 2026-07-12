import { Router } from 'express';

import { authRouter } from './auth.routes';
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
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/registrations', registrationRouter);
apiRouter.use('/profiles', profileRouter);
apiRouter.use('/lookups', lookupRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/matches', matchRouter);
apiRouter.use('/partner-preferences', partnerPreferenceRouter);

// Milestone 3 (next): apiRouter.use('/payments', paymentRouter); apiRouter.use('/subscriptions', subscriptionRouter); ...
