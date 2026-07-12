import { Types } from 'mongoose';

import { RegistrationDraftModel } from '@models/RegistrationDraft.model';

export const registrationDraftRepository = {
  findByUserId(userId: string | Types.ObjectId) {
    return RegistrationDraftModel.findOne({ userId });
  },

  upsert(userId: string | Types.ObjectId, patch: Record<string, unknown>) {
    return RegistrationDraftModel.findOneAndUpdate(
      { userId },
      { $set: { data: patch } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  },

  async deleteByUserId(userId: string | Types.ObjectId): Promise<void> {
    await RegistrationDraftModel.deleteOne({ userId });
  },
};
