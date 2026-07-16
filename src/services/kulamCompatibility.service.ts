import {
    IKulamCompatibility,
    KulamCompatibilityModel,
} from "@models/KulamCompatibility.model";

export const kulamCompatibilityService = {
  async findAll(): Promise<IKulamCompatibility[]> {
    return KulamCompatibilityModel.find({}).lean();
  },
};
