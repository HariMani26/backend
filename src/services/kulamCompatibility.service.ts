import {
    IKulamCompatibility,
    KulamCompatibilityModel,
} from "@models/KulamCompatibility.model";
import { Container, Service } from "typedi";

@Service()
export class KulamCompatibilityService {
  public async findAll(): Promise<IKulamCompatibility[]> {
    return KulamCompatibilityModel.find({}).lean();
  }
}

export const kulamCompatibilityService = Container.get(
  KulamCompatibilityService,
);
