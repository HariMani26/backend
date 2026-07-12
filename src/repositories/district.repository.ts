import { DistrictModel } from '@models/District.model';

export const districtRepository = {
  findAll() {
    return DistrictModel.find().sort({ name: 1 });
  },
};
