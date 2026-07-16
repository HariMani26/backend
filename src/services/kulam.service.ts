import { IKulam, KulamModel } from "@models/Kulam.model";

export const kulamService = {
  async findAll(): Promise<IKulam[]> {
    return KulamModel.find({}).sort({ labelEn: 1 }).lean();
  },
};
