import { InterestModel } from '@models/Interest.model';
import { UserModel } from '@models/User.model';
import { ApiError } from '@utils/ApiError';
import { toProfileSummary } from '@utils/serializers';
import { resolvePrimaryPhotoUrls } from '@utils/profilePhotoUrls';
import { evaluateAccess } from './access.service';
import { profileService } from './profile.service';

export class InterestService {
  async send(userId: string, targetId: string) {
    const sender = await profileService.findByUserId(userId);
    if (!sender) throw ApiError.badRequest('Complete registration before sending interest');
    if (!evaluateAccess(sender).hasFullAccess || sender.marriageStatus.isMarried) {
      throw ApiError.forbidden('An active verified membership is required to send interest');
    }
    const target = await profileService.findPublicById(targetId);
    if (!target) throw ApiError.notFound('Profile not found');
    if (String(target.userId) === userId) throw ApiError.badRequest('You cannot send interest to yourself');
    try {
      const interest = await InterestModel.findOneAndUpdate(
        { senderUserId: userId, receiverUserId: target.userId },
        { $setOnInsert: { senderProfileId: sender._id, targetProfileId: target._id } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return { id: String(interest!._id) };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await InterestModel.findOne({ senderUserId: userId, receiverUserId: target.userId });
        if (existing) return { id: String(existing._id) };
      }
      throw error;
    }
  }

  async received(userId: string, page: number, limit: number) {
    const viewer = await profileService.findByUserId(userId);
    const hasAccess = evaluateAccess(viewer).hasFullAccess;
    const filter = { receiverUserId: userId };
    const [interests, total, unread] = await Promise.all([
      InterestModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      InterestModel.countDocuments(filter),
      InterestModel.countDocuments({ ...filter, readAt: { $exists: false } }),
    ]);
    const items = await Promise.all(interests.map(async (interest) => {
      const sender = await profileService.findPublicById(String(interest.senderProfileId));
      if (!sender) return null;
      const owner = await UserModel.findOne({ _id: sender.userId, isActive: true, isDeleted: { $ne: true } });
      if (!owner) return null;
      const photos = hasAccess ? await resolvePrimaryPhotoUrls([sender]) : new Map<string, string>();
      return {
        id: String(interest._id), createdAt: interest.createdAt, unread: !interest.readAt,
        profile: toProfileSummary(sender, photos.get(String(sender.primaryPhotoId))),
        ...(hasAccess && owner.preferences?.showContact ? { whatsapp: sender.whatsapp } : {}),
      };
    }));
    return { items: items.filter((item) => item !== null), total, unread, page, limit };
  }

  async count(userId: string) {
    const [total, unread] = await Promise.all([
      InterestModel.countDocuments({ receiverUserId: userId }),
      InterestModel.countDocuments({ receiverUserId: userId, readAt: { $exists: false } }),
    ]);
    return { total, unread };
  }

  async markRead(userId: string, id: string) {
    const result = await InterestModel.updateOne({ _id: id, receiverUserId: userId }, { $set: { readAt: new Date() } });
    if (!result.matchedCount) throw ApiError.notFound('Interest not found');
  }
}

export const interestService = new InterestService();