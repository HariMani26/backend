import { HydratedDocument, Types } from "mongoose";

import {
    IRegistrationDraft,
    RegistrationDraftModel,
} from "@models/RegistrationDraft.model";
import { Container, Service } from "typedi";

@Service()
export class RegistrationDraftService {
  public async findByUserId(
    userId: string,
  ): Promise<HydratedDocument<IRegistrationDraft> | null> {
    return RegistrationDraftModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  }

  public async upsert(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    await RegistrationDraftModel.findOneAndUpdate(
      { userId: userObjectId },
      { $set: { userId: userObjectId, data } },
      { upsert: true, new: true },
    );
  }

  public async deleteByUserId(userId: string): Promise<void> {
    await RegistrationDraftModel.deleteOne({
      userId: new Types.ObjectId(userId),
    });
  }
}

export const registrationDraftService = Container.get(RegistrationDraftService);
