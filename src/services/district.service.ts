import { DistrictModel, IDistrict } from "@models/District.model";

export const districtService = {
  async findAll(): Promise<IDistrict[]> {
    return DistrictModel.find({}).sort({ name: 1 }).lean();
  },
};
