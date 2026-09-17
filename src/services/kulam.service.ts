import { IKulam, KulamModel } from "@models/Kulam.model";
import { Container, Service } from "typedi";

@Service()
export class KulamService {
  public async findAll(): Promise<IKulam[]> {
    return KulamModel.find({}).sort({ labelEn: 1 }).lean();
  }
}

export const kulamService = Container.get(KulamService);
