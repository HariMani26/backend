import { HydratedDocument, Types } from "mongoose";

import {
    IRegistrationDraft,
    RegistrationDraftModel,
} from "@models/RegistrationDraft.model";

export const registrationDraftService = {
  async findByUserId(
    userId: string,
  ): Promise<HydratedDocument<IRegistrationDraft> | null> {
    return RegistrationDraftModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  },

  async upsert(userId: string, data: Record<string, unknown>): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    await RegistrationDraftModel.findOneAndUpdate(
      { userId: userObjectId },
      { $set: { userId: userObjectId, data } },
      { upsert: true, new: true },
    );
  },

  async deleteByUserId(userId: string): Promise<void> {
    await RegistrationDraftModel.deleteOne({
      userId: new Types.ObjectId(userId),
    });
  },
};
