import { HydratedDocument, Types, startSession } from 'mongoose';
import { AdminCreateMember, AdminListQuery, Moderation, storyEditSchema } from '@dto/admin.dto';
import { z } from 'zod';
import { AuditLogModel } from '@models/AuditLog.model';
import { PaymentModel } from '@models/Payment.model';
import { PartnerPreferenceModel } from '@models/PartnerPreference.model';
import { PlatformSettingsModel } from '@models/PlatformSettings.model';
import { IProfile, ProfileModel } from '@models/Profile.model';
import { NOT_DELETED, UserModel } from '@models/User.model';
import { ApiError } from '@utils/ApiError';
import { toPublicProfile, toPublicUser } from '@utils/serializers';
import { Role } from '../enum/role.enum';
import { generateReferenceId, QUICK_REGISTRATION_PLACEHOLDER_FIELDS } from './registration.service';
import { FullRegistrationBody } from '@dto/registration.dto';
import { UploadedFileModel } from '@models/UploadedFile.model';

export function moderateProfile(profile: IProfile, action: Moderation['action']): void {
  if (action === 'delete') { profile.isDeleted = true; profile.deletedAt = new Date(); return; }
  if (action === 'suspend') {
    if (profile.verificationStatus === 'suspended') throw ApiError.conflict('Profile is already suspended');
    profile.previousVerificationStatus = profile.verificationStatus;
    profile.verificationStatus = 'suspended';
    return;
  }
  if (action === 'unsuspend') {
    if (profile.verificationStatus !== 'suspended') throw ApiError.conflict('Profile is not suspended');
    profile.verificationStatus = profile.previousVerificationStatus ?? 'unverified';
    profile.previousVerificationStatus = undefined;
    return;
  }
  if (profile.verificationStatus === 'suspended') throw ApiError.conflict('Unsuspend the profile before reviewing it');
  if (profile.verificationStatus === 'refunded') throw ApiError.conflict('Refunded profiles require membership resolution first');
  profile.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
}

export function assertStoryPublishable(profile: IProfile): void {
  if (!profile.marriageStatus.isMarried || !profile.marriageStatus.consentForTestimonial) throw ApiError.forbidden('Member consent is required to publish');
  const story = profile.successStory;
  if (!story || !story.title || !story.titleTa || !story.summary || !story.summaryTa || !story.fullStory || !story.fullStoryTa) throw ApiError.badRequest('Complete both language versions before publishing');
  if ((profile.successStory.photoIds.length || profile.successStory.videoUrl) && !profile.marriageStatus.consentForPhotos) throw ApiError.forbidden('Photo consent is required to publish media');
}

export class AdminService {
  async completeRegistration(actorId: string, profileId: string, payload: FullRegistrationBody, reason: string) {
    const session = await startSession();
    let result: ReturnType<typeof toPublicProfile> | undefined;
    try {
      await session.withTransaction(async () => {
        const profile = await ProfileModel.findOne({ _id: profileId, ...NOT_DELETED }).session(session);
        if (!profile) throw ApiError.notFound('Profile not found');
        const owner = await UserModel.findOne({ _id: profile.userId, role: 'user', isActive: true, ...NOT_DELETED }).session(session);
        if (!owner || String(owner._id) === actorId) throw ApiError.forbidden('This account cannot be completed here');
        if (profile.registrationType !== 'quick') throw ApiError.conflict('Registration is already complete');
        const photo = await UploadedFileModel.exists({ userId: owner._id, type: { $in: ['profile-image', 'gallery'] }, isDeleted: false, verificationStatus: { $ne: 'rejected' } }).session(session);
        if (!photo) throw ApiError.badRequest('Attach at least one customer profile photo before completing registration');
        const { partnerPreference, ...fields } = payload;
        Object.assign(profile, fields, { registrationType: 'full', profileType: payload.gender === 'male' ? 'groom' : 'bride', updatedBy: new Types.ObjectId(actorId) });
        await profile.save({ session });
        await PartnerPreferenceModel.updateOne({ userId: owner._id }, { $set: partnerPreference }, { upsert: true, runValidators: true, session });
        await AuditLogModel.create([{ actorId, action: 'profile.complete-registration', targetId: profileId, reason, details: { userId: String(owner._id), previousRegistrationType: 'quick', registrationType: 'full' } }], { session });
        result = toPublicProfile(profile);
      });
      return result!;
    } finally { await session.endSession(); }
  }

  async registration(profileId: string) {
    const profile = await ProfileModel.findOne({ _id: profileId, ...NOT_DELETED });
    if (!profile) throw ApiError.notFound('Profile not found');
    const owner = await UserModel.findOne({ _id: profile.userId, role: 'user', isActive: true, ...NOT_DELETED });
    if (!owner) throw ApiError.forbidden('This account cannot be completed here');
    const partnerPreference = await PartnerPreferenceModel.findOne({ userId: owner._id });
    return { profile: { ...toPublicProfile(profile), mobile: owner.mobile }, partnerPreference };
  }

  async createMember(actorId: string, input: AdminCreateMember) {
    const session = await startSession();
    let result: ReturnType<typeof toPublicProfile> | undefined;
    try {
      await session.withTransaction(async () => {
        const existing = await UserModel.findOne({ mobile: input.mobile }).session(session);
        if (existing) throw ApiError.conflict('An account with this mobile number already exists');
        const [user] = await UserModel.create([{
          mobile: input.mobile, countryCode: '+91', role: Role.User,
          isActive: true, isPhoneVerified: false, createdBy: actorId,
        }], { session });
        const [profile] = await ProfileModel.create([{
          ...QUICK_REGISTRATION_PLACEHOLDER_FIELDS, ...input.profile,
          userId: user._id, referenceId: await generateReferenceId(),
          profileType: input.profile.gender === 'male' ? 'groom' : 'bride',
          registrationType: 'quick', verificationStatus: 'unverified', createdBy: actorId,
        }], { session });
        await PartnerPreferenceModel.create([{ userId: user._id, ageMin: 21, ageMax: 31 }], { session });
        await AuditLogModel.create([{
          actorId, action: 'profile.create', targetId: String(profile._id), reason: input.reason,
          details: { userId: String(user._id), consentConfirmed: input.consentConfirmed, registrationType: 'quick' },
        }], { session });
        result = toPublicProfile(profile);
      });
      return result!;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw ApiError.conflict('Account or profile already exists; refresh and try again');
      throw error;
    } finally { await session.endSession(); }
  }

  async dashboard() {
    const [statuses, totalUsers, married, revenue, registrations, payments] = await Promise.all([
      ProfileModel.aggregate([{ $match: NOT_DELETED }, { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }]),
      UserModel.countDocuments({ ...NOT_DELETED, role: 'user' }),
      ProfileModel.countDocuments({ ...NOT_DELETED, 'marriageStatus.isMarried': true }),
      PaymentModel.aggregate([{ $match: { status: 'captured' } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      ProfileModel.aggregate([{ $match: NOT_DELETED }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 12 }]),
      PaymentModel.aggregate([{ $match: { status: 'captured' } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' } } }, { $sort: { _id: -1 } }, { $limit: 12 }]),
    ]);
    return { totalUsers, married, statuses: Object.fromEntries(statuses.map((entry) => [entry._id, entry.count])), revenue: revenue[0]?.amount ?? 0, paymentCount: revenue[0]?.count ?? 0, registrations, payments };
  }

  async users(query: AdminListQuery) {
    const filter: Record<string, unknown> = { ...NOT_DELETED };
    if (query.status === 'married') filter['marriageStatus.isMarried'] = true;
    else if (query.status !== 'all') filter.verificationStatus = query.status;
    if (query.district) filter.district = query.district;
    if (query.gender !== 'all') filter.gender = query.gender;
    if (query.registrationType !== 'all') filter.registrationType = query.registrationType;
    if (query.marriage !== 'all') filter['marriageStatus.isMarried'] = query.marriage !== 'unmarried';
    if (query.marriage === 'platform' || query.marriage === 'elsewhere') filter['marriageStatus.marriedThroughPlatform'] = query.marriage === 'platform';
    if (query.ageMin !== undefined || query.ageMax !== undefined) {
      const birthday = (age: number) => {
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCFullYear(date.getUTCFullYear() - age);
        return date;
      };
      filter.dob = { ...(query.ageMin !== undefined ? { $lte: birthday(query.ageMin) } : {}), ...(query.ageMax !== undefined ? { $gt: birthday(query.ageMax + 1) } : {}) };
    }
    if (query.search) {
      const regex = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const owners = await UserModel.find({ ...NOT_DELETED, role: 'user', mobile: { $regex: regex } }).select('_id');
      filter.$or = [{ name: { $regex: regex, $options: 'i' } }, { referenceId: { $regex: regex, $options: 'i' } }, { userId: { $in: owners.map((owner) => owner._id) } }];
    }
    const [profiles, total, districts] = await Promise.all([
      ProfileModel.find(filter).sort({ [query.sortBy]: query.sortDirection === 'asc' ? 1 : -1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit), ProfileModel.countDocuments(filter),
      ProfileModel.distinct('district', NOT_DELETED),
    ]);
    const owners = await UserModel.find({ _id: { $in: profiles.map((profile) => profile.userId) }, ...NOT_DELETED }).select('_id mobile');
    const mobiles = new Map(owners.map((owner) => [String(owner._id), owner.mobile]));
    return { items: profiles.map((profile) => ({ ...toPublicProfile(profile), mobile: mobiles.get(String(profile.userId)) })), total, page: query.page, limit: query.limit, districts: districts.filter(Boolean).sort() };
  }

  async profileMutation(actorId: string, profileId: string, action: string, reason: string, mutate: (profile: HydratedDocument<IProfile>) => void) {
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        const profile = await ProfileModel.findOne({ _id: profileId, ...NOT_DELETED }).session(session);
        if (!profile) throw ApiError.notFound('Profile not found');
        const owner = await UserModel.findOne({ _id: profile.userId, role: 'user', ...NOT_DELETED }).session(session);
        if (!owner || String(owner._id) === actorId) throw ApiError.forbidden('This account cannot be moderated here');
        const previousStatus = profile.verificationStatus;
        mutate(profile);
        profile.updatedBy = new Types.ObjectId(actorId);
        await profile.save({ session });
        if (profile.isDeleted) {
          await UserModel.updateOne({ _id: owner._id }, { $set: { isDeleted: true, isActive: false, deletedAt: new Date() } }, { session });
        }
        await AuditLogModel.create([{ actorId, action, targetId: profileId, reason, details: { previousStatus, status: profile.verificationStatus } }], { session });
      });
    } finally { await session.endSession(); }
  }

  async moderate(actorId: string, profileId: string, change: Moderation) {
    await this.profileMutation(actorId, profileId, `profile.${change.action}`, change.reason, (profile) => {
      moderateProfile(profile, change.action); profile.verificationReason = change.reason;
    });
  }

  async payments(page: number, limit: number) {
    const [items, total] = await Promise.all([
      PaymentModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), PaymentModel.countDocuments(),
    ]);
    return { items: items.map((payment) => ({ id: String(payment._id), userId: String(payment.userId), orderId: payment.orderId, paymentId: payment.paymentId, planName: payment.planName, amount: payment.amount, currency: payment.currency, status: payment.status, createdAt: payment.createdAt })), total, page, limit };
  }

  async settings() {
    const settings = await PlatformSettingsModel.findOne({ key: 'platform' });
    return { platformName: settings?.platformName ?? 'WeOur Matrimony', tagline: settings?.tagline ?? '', supportEmail: settings?.supportEmail ?? '', supportPhone: settings?.supportPhone ?? '', whatsapp: settings?.whatsapp ?? '', workingDays: settings?.workingDays ?? '', workingHours: settings?.workingHours ?? '' };
  }

  async saveSettings(actorId: string, settings: Awaited<ReturnType<AdminService['settings']>>) {
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        await PlatformSettingsModel.updateOne({ key: 'platform' }, { $set: settings }, { upsert: true, session });
        await AuditLogModel.create([{ actorId, action: 'settings.update', targetId: 'platform', details: { fields: Object.keys(settings) } }], { session });
      });
    } finally { await session.endSession(); }
    return this.settings();
  }

  async stories(page: number, limit: number, status: string) {
    const filter = { ...NOT_DELETED, 'marriageStatus.isMarried': true, ...(status !== 'all' ? { 'marriageStatus.storyStatus': status } : {}) };
    const [profiles, total] = await Promise.all([ProfileModel.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit), ProfileModel.countDocuments(filter)]);
    return { items: profiles.map(toPublicProfile), total, page, limit };
  }

  async saveStory(actorId: string, id: string, content: Required<z.infer<typeof storyEditSchema>>, reason: string) {
    await this.profileMutation(actorId, id, 'story.edit', reason, (profile) => {
      if (!profile.marriageStatus.isMarried || !profile.marriageStatus.consentForTestimonial) throw ApiError.forbidden('Member consent is required');
      profile.successStory = { ...content, photoIds: profile.successStory?.photoIds ?? [], coverPhotoIndex: profile.successStory?.coverPhotoIndex ?? 0, viewCount: profile.successStory?.viewCount ?? 0, marriageDate: profile.marriageStatus.marriageDate, videoUrl: profile.successStory?.videoUrl };
      profile.marriageStatus.storyStatus = 'user-submitted';
    });
  }

  async publishStory(actorId: string, id: string, publish: boolean, reason: string) {
    await this.profileMutation(actorId, id, publish ? 'story.publish' : 'story.unpublish', reason, (profile) => {
      if (publish) {
        assertStoryPublishable(profile);
        profile.successStory!.publishedDate = new Date();
      }
      profile.marriageStatus.storyStatus = publish ? 'published' : 'declined';
    });
  }

  async administrators() {
    const users = await UserModel.find({ ...NOT_DELETED, role: { $in: ['admin', 'superAdmin'] } }).sort({ adminGrantedAt: -1 });
    return users.map((user) => ({ ...toPublicUser(user), grantedAt: user.adminGrantedAt }));
  }

  async changeRole(actorId: string, mobile: string, action: 'grant' | 'revoke', reason: string) {
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        const actor = await UserModel.findOne({ _id: actorId, role: 'superAdmin', isActive: true, ...NOT_DELETED }).session(session);
        if (!actor) throw ApiError.forbidden('Super admin access required');
        const target = await UserModel.findOne({ mobile, isActive: true, isPhoneVerified: true, ...NOT_DELETED }).session(session);
        if (!target) throw ApiError.notFound('Active phone-verified account not found');
        if (String(target._id) === actorId || target.role === 'superAdmin') throw ApiError.forbidden('Super admins cannot be changed here');
        if (target.role !== (action === 'grant' ? 'user' : 'admin')) throw ApiError.conflict('Account role has already changed');
        target.role = (action === 'grant' ? 'admin' : 'user') as Role;
        target.adminGrantedBy = new Types.ObjectId(actorId);
        target.adminGrantedAt = new Date();
        await target.save({ session });
        await AuditLogModel.create([{ actorId, action: `admin.${action}`, targetId: String(target._id), reason }], { session });
      });
    } finally { await session.endSession(); }
  }
}
export const adminService = new AdminService();