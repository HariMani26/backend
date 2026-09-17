import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middlewares/authenticate';
import { authRateLimiter } from '@middlewares/rateLimiter';
import { validateRequest } from '@middlewares/validateRequest';
import { sendSuccess } from '@helpers/apiResponse';
import { asyncHandler } from '@utils/asyncHandler';
import { ApiError } from '@utils/ApiError';
import { paymentService } from '@services/payment.service';

export const paymentRouter = Router();
paymentRouter.post('/webhook', asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) throw ApiError.badRequest('Raw webhook body required');
  await paymentService.webhook(req.body, req.get('x-razorpay-signature') ?? '');
  sendSuccess(res, null, 'Webhook processed');
}));
paymentRouter.use(authenticate);
paymentRouter.get('/subscription', asyncHandler(async (req, res) => { sendSuccess(res, await paymentService.summary(req.user!.id), 'Subscription'); }));
paymentRouter.post('/orders', authRateLimiter, validateRequest({ body: z.object({ planId: z.string().regex(/^[a-f0-9]{24}$/i) }).strict() }), asyncHandler(async (req, res) => {
  sendSuccess(res, await paymentService.createOrder(req.user!.id, req.body.planId), 'Payment order created');
}));
paymentRouter.post('/verify', authRateLimiter, validateRequest({ body: z.object({ orderId: z.string().regex(/^order_[a-zA-Z0-9]+$/), paymentId: z.string().regex(/^pay_[a-zA-Z0-9]+$/), signature: z.string().regex(/^[a-f0-9]{64}$/i) }).strict() }), asyncHandler(async (req, res) => {
  sendSuccess(res, await paymentService.verify(req.user!.id, req.body.orderId, req.body.paymentId, req.body.signature), 'Payment verified');
}));