import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middlewares/authenticate';
import { apiRateLimiter } from '@middlewares/rateLimiter';
import { validateRequest } from '@middlewares/validateRequest';
import { sendSuccess } from '@helpers/apiResponse';
import { chatService } from '@services/chat.service';
import { asyncHandler } from '@utils/asyncHandler';
import { validateProfileIdParams } from '@validators/profile.validator';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
export const messageBodySchema = z.object({ text: z.string().trim().min(1).max(4000), clientId: z.string().uuid() }).strict();
export const chatRouter = Router();
chatRouter.use(authenticate, apiRateLimiter);
chatRouter.get('/', validateRequest({ query: z.object({ page: z.coerce.number().int().min(1).default(1) }) }), asyncHandler(async (req, res) => { sendSuccess(res, await chatService.list(req.user!.id, Number(req.query.page)), 'Conversations'); }));
chatRouter.post('/', validateRequest({ body: z.object({ profileId: objectId }).strict() }), asyncHandler(async (req, res) => { sendSuccess(res, await chatService.open(req.user!.id, req.body.profileId), 'Conversation opened'); }));
chatRouter.get('/:id/messages', validateProfileIdParams, validateRequest({ query: z.object({ before: objectId.optional() }) }), asyncHandler(async (req, res) => { sendSuccess(res, await chatService.messages(req.user!.id, req.params.id as string, req.query.before as string | undefined), 'Messages'); }));
chatRouter.post('/:id/messages', validateProfileIdParams, validateRequest({ body: messageBodySchema }), asyncHandler(async (req, res) => { sendSuccess(res, await chatService.send(req.user!.id, req.params.id as string, req.body.text, req.body.clientId), 'Message sent'); }));
chatRouter.post('/:id/read', validateProfileIdParams, validateRequest({ body: z.object({ through: objectId }).strict() }), asyncHandler(async (req, res) => { await chatService.read(req.user!.id, req.params.id as string, req.body.through); sendSuccess(res, null, 'Messages read'); }));