import { DistrictModel, IDistrict } from "@models/District.model";
import { Container, Service } from "typedi";

@Service()
export class DistrictService {
  public async findAll(): Promise<IDistrict[]> {
    return DistrictModel.find({}).sort({ name: 1 }).lean();
  }
}

export const districtService = Container.get(DistrictService);
