import { HydratedDocument, Types } from "mongoose";

import {
    IPartnerPreference,
    PartnerPreferenceModel,
} from "@models/PartnerPreference.model";
import { Container, Service } from "typedi";

const NOT_DELETED = { isDeleted: { $ne: true } };

@Service()
export class PartnerPreferenceService {
  public async findByUserId(
    userId: string,
  ): Promise<HydratedDocument<IPartnerPreference> | null> {
    return PartnerPreferenceModel.findOne({
      userId: new Types.ObjectId(userId),
      ...NOT_DELETED,
    });
  }

  public async upsertByUserId(
    userId: string,
    data: Partial<IPartnerPreference>,
  ): Promise<HydratedDocument<IPartnerPreference>> {
    const userObjectId = new Types.ObjectId(userId);
    const defaults = {
      ageMin: 21,
      ageMax: 31,
      preferredKulams: [],
      preferredDistricts: [],
      preferredEducation: [],
      preferredJobs: [],
      isDeleted: false,
    };

    return PartnerPreferenceModel.findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: {
          ...defaults,
          ...data,
          userId: userObjectId,
          isDeleted: false,
          deletedAt: undefined,
        },
      },
      { upsert: true, new: true },
    ) as Promise<HydratedDocument<IPartnerPreference>>;
  }
}

export const partnerPreferenceService = Container.get(PartnerPreferenceService);
