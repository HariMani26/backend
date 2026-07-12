import { KulamModel } from '@models/Kulam.model';

export const kulamRepository = {
  findAll() {
    return KulamModel.find().sort({ labelEn: 1 });
  },
};
