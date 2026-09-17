import { Router } from 'express';
import { z } from 'zod';
import { adminCreateMemberSchema, adminListSchema, adminProfileUpdateSchema, adminRoleSchema, moderationSchema, platformSettingsSchema, storyEditSchema } from '@dto/admin.dto';
import { sendSuccess } from '@helpers/apiResponse';
import { authenticate } from '@middlewares/authenticate';
import { requireRoles } from '@middlewares/authorize';
import { validateRequest } from '@middlewares/validateRequest';
import { apiRateLimiter } from '@middlewares/rateLimiter';
import { adminService } from '@services/admin.service';
import { asyncHandler } from '@utils/asyncHandler';
import { validateProfileIdParams } from '@validators/profile.validator';
import { fullRegistrationSchema } from '@dto/registration.dto';
import { uploadSingleFile } from '@middlewares/upload';
import { uploadService } from '@services/upload.service';
import { UploadedFileModel } from '@models/UploadedFile.model';
import { AuditLogModel } from '@models/AuditLog.model';
import { ApiError } from '@utils/ApiError';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRoles('admin', 'superAdmin'), apiRateLimiter);
adminRouter.get('/dashboard', asyncHandler(async (_req, res) => { sendSuccess(res, await adminService.dashboard(), 'Dashboard'); }));
adminRouter.get('/users', validateRequest({ query: adminListSchema }), asyncHandler(async (req, res) => { sendSuccess(res, await adminService.users(adminListSchema.parse(req.query)), 'Users'); }));
adminRouter.post('/users', validateRequest({ body: adminCreateMemberSchema }), asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.createMember(req.user!.id, req.body), 'Member created', 201);
}));
adminRouter.get('/users/:id/registration', validateProfileIdParams, asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.registration(req.params.id as string), 'Member registration');
}));
adminRouter.put('/users/:id/registration', validateProfileIdParams, validateRequest({ body: z.object({ profile: fullRegistrationSchema, reason: z.string().trim().min(3).max(1000) }).strict() }), asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.completeRegistration(req.user!.id, req.params.id as string, req.body.profile, req.body.reason), 'Registration completed');
}));
adminRouter.get('/users/:id/uploads', validateProfileIdParams, asyncHandler(async (req, res) => {
  const { profile } = await adminService.registration(req.params.id as string);
  const files = await uploadService.listUserPhotos(profile.userId);
  sendSuccess(res, files.filter((file) => file.type !== 'chat-image'), 'Customer files');
}));
adminRouter.post('/users/:id/uploads/:type', validateRequest({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i), type: z.enum(['profile-image', 'gallery', 'horoscope', 'document']) }) }), uploadSingleFile, asyncHandler(async (req, res) => {
  const { profile } = await adminService.registration(req.params.id as string);
  if (!req.file) throw ApiError.badRequest('A file is required');
  const type = req.params.type as 'profile-image' | 'gallery' | 'horoscope' | 'document';
  const file = type === 'horoscope' ? await uploadService.uploadHoroscope(profile.userId, req.file)
    : type === 'document' ? await uploadService.uploadDocument(profile.userId, req.file)
    : await uploadService.uploadPhoto(profile.userId, type, req.file);
  await AuditLogModel.create({ actorId: req.user!.id, action: 'profile.file-upload', targetId: profile.id, details: { fileId: String((file as unknown as { _id: unknown })._id), type } });
  sendSuccess(res, file, 'Customer file uploaded', 201);
}));
const customerFileParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i), fileId: z.string().regex(/^[a-f\d]{24}$/i) });
adminRouter.put('/users/:id/uploads/:fileId', validateRequest({ params: customerFileParams }), uploadSingleFile, asyncHandler(async (req, res) => {
  const { profile } = await adminService.registration(req.params.id as string);
  const fileId = req.params.fileId as string;
  if (!await UploadedFileModel.exists({ _id: fileId, userId: profile.userId, isDeleted: false, type: { $ne: 'chat-image' } })) throw ApiError.notFound('Customer file not found');
  if (!req.file) throw ApiError.badRequest('A file is required');
  const file = await uploadService.replaceFile(profile.userId, fileId, req.file);
  await AuditLogModel.create({ actorId: req.user!.id, action: 'profile.file-replace', targetId: profile.id, details: { fileId } });
  sendSuccess(res, file, 'Customer file replaced');
}));
adminRouter.delete('/users/:id/uploads/:fileId', validateRequest({ params: customerFileParams }), asyncHandler(async (req, res) => {
  const { profile } = await adminService.registration(req.params.id as string);
  const fileId = req.params.fileId as string;
  if (!await UploadedFileModel.exists({ _id: fileId, userId: profile.userId, isDeleted: false, type: { $ne: 'chat-image' } })) throw ApiError.notFound('Customer file not found');
  await uploadService.deleteFile(profile.userId, fileId);
  await AuditLogModel.create({ actorId: req.user!.id, action: 'profile.file-delete', targetId: profile.id, details: { fileId } });
  sendSuccess(res, null, 'Customer file deleted');
}));
adminRouter.post('/users/:id/moderate', validateProfileIdParams, validateRequest({ body: moderationSchema }), asyncHandler(async (req, res) => {
  await adminService.moderate(req.user!.id, req.params.id as string, req.body); sendSuccess(res, null, 'Profile updated');
}));
adminRouter.patch('/users/:id', validateProfileIdParams, validateRequest({ body: z.object({ changes: adminProfileUpdateSchema, reason: z.string().trim().min(3).max(1000) }).strict() }), asyncHandler(async (req, res) => {
  await adminService.profileMutation(req.user!.id, req.params.id as string, 'profile.edit', req.body.reason, (profile) => { Object.assign(profile, req.body.changes); if (req.body.changes.gender) profile.profileType = req.body.changes.gender === 'male' ? 'groom' : 'bride'; });
  sendSuccess(res, null, 'Profile updated');
}));
adminRouter.get('/payments', validateRequest({ query: adminListSchema }), asyncHandler(async (req, res) => { sendSuccess(res, await adminService.payments(Number(req.query.page), Number(req.query.limit)), 'Payments'); }));
adminRouter.get('/settings', asyncHandler(async (_req, res) => { sendSuccess(res, await adminService.settings(), 'Platform settings'); }));
adminRouter.put('/settings', validateRequest({ body: platformSettingsSchema }), asyncHandler(async (req, res) => { sendSuccess(res, await adminService.saveSettings(req.user!.id, req.body), 'Settings saved'); }));
adminRouter.get('/stories', validateRequest({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), status: z.enum(['all', 'none', 'user-submitted', 'published', 'declined']).default('user-submitted') }) }), asyncHandler(async (req, res) => { sendSuccess(res, await adminService.stories(Number(req.query.page), Number(req.query.limit), req.query.status as string), 'Success stories'); }));
adminRouter.put('/stories/:id', validateProfileIdParams, validateRequest({ body: z.object({ content: storyEditSchema, reason: z.string().trim().min(3).max(1000) }).strict() }), asyncHandler(async (req, res) => { await adminService.saveStory(req.user!.id, req.params.id as string, req.body.content, req.body.reason); sendSuccess(res, null, 'Story saved for review'); }));
adminRouter.post('/stories/:id/publish', validateProfileIdParams, validateRequest({ body: z.object({ publish: z.boolean(), reason: z.string().trim().min(3).max(1000) }).strict() }), asyncHandler(async (req, res) => { await adminService.publishStory(req.user!.id, req.params.id as string, req.body.publish, req.body.reason); sendSuccess(res, null, 'Publication updated'); }));
adminRouter.get('/administrators', requireRoles('superAdmin'), asyncHandler(async (_req, res) => { sendSuccess(res, await adminService.administrators(), 'Administrators'); }));
adminRouter.post('/administrators', requireRoles('superAdmin'), validateRequest({ body: adminRoleSchema }), asyncHandler(async (req, res) => { await adminService.changeRole(req.user!.id, req.body.mobile, req.body.action, req.body.reason); sendSuccess(res, null, 'Admin role updated'); }));