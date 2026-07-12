import { KulamCompatibilityModel } from '@models/KulamCompatibility.model';

export const kulamCompatibilityRepository = {
  findAll() {
    return KulamCompatibilityModel.find();
  },
};
