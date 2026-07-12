import { Types } from 'mongoose';

import { IPartnerPreference, PartnerPreferenceModel } from '@models/PartnerPreference.model';

export type PartnerPreferenceInput = Omit<IPartnerPreference, 'userId' | 'isDeleted' | 'deletedAt'>;

export const partnerPreferenceRepository = {
  findByUserId(userId: string | Types.ObjectId) {
    return PartnerPreferenceModel.findOne({ userId, isDeleted: { $ne: true } });
  },

  upsertByUserId(userId: string | Types.ObjectId, patch: PartnerPreferenceInput) {
    return PartnerPreferenceModel.findOneAndUpdate(
      { userId },
      { $set: { ...patch, userId, isDeleted: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  },
};
