import { FilterQuery, HydratedDocument, Types } from "mongoose";

import { Gender, IProfile, ProfileModel } from "@models/Profile.model";
import { Container, Service } from "typedi";

const NOT_DELETED = { isDeleted: { $ne: true } };

export interface ProfileSearchFilters {
  publicOnly?: boolean;
  excludeUserId?: string;
  name?: string;
  gender?: Gender;
  state?: string;
  district?: string;
  kulam?: string;
  ageFrom?: number;
  ageTo?: number;
}

export type CreateProfileInput = Record<string, unknown>;

function ageRangeToDobFilter(
  ageFrom?: number,
  ageTo?: number,
): Record<string, Date> | undefined {
  const now = new Date();
  const dobFilter: Record<string, Date> = {};

  if (typeof ageFrom === "number") {
    const latestDob = new Date(now);
    latestDob.setFullYear(latestDob.getFullYear() - ageFrom);
    dobFilter.$lte = latestDob;
  }

  if (typeof ageTo === "number") {
    const earliestDob = new Date(now);
    earliestDob.setFullYear(earliestDob.getFullYear() - ageTo - 1);
    earliestDob.setDate(earliestDob.getDate() + 1);
    dobFilter.$gte = earliestDob;
  }

  return Object.keys(dobFilter).length ? dobFilter : undefined;
}

function buildSearchQuery(
  filters: ProfileSearchFilters,
): FilterQuery<IProfile> {
  const query: FilterQuery<IProfile> = { ...NOT_DELETED };
  query["marriageStatus.isMarried"] = { $ne: true };

  if (filters.publicOnly) {
    query.verificationStatus = { $in: ["unverified", "verified"] };
    query["marriageStatus.isMarried"] = { $ne: true };
  }

  if (filters.excludeUserId) {
    query.userId = { $ne: new Types.ObjectId(filters.excludeUserId) };
  }
  if (filters.name) {
    query.name = { $regex: filters.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }
  if (filters.gender) {
    query.gender = filters.gender;
  }
  if (filters.state) {
    query.state = filters.state;
  }
  if (filters.district) {
    query.district = filters.district;
  }
  if (filters.kulam) {
    query.kulam = filters.kulam.toLowerCase();
  }

  const dobFilter = ageRangeToDobFilter(filters.ageFrom, filters.ageTo);
  if (dobFilter) {
    query.dob = dobFilter;
  }

  return query;
}

@Service()
export class ProfileService {
  public async findByUserId(
    userId: string,
  ): Promise<HydratedDocument<IProfile> | null> {
    return ProfileModel.findOne({
      userId: new Types.ObjectId(userId),
      ...NOT_DELETED,
    });
  }

  public async findById(
    id: string,
  ): Promise<HydratedDocument<IProfile> | null> {
    return ProfileModel.findOne({ _id: id, ...NOT_DELETED });
  }

  public async findPublicById(id: string): Promise<HydratedDocument<IProfile> | null> {
    return ProfileModel.findOne({ _id: id, ...buildSearchQuery({ publicOnly: true }) });
  }

  public async countAll(): Promise<number> {
    return ProfileModel.countDocuments(NOT_DELETED);
  }

  public async existsByReferenceId(referenceId: string): Promise<boolean> {
    const found = await ProfileModel.exists({ referenceId, ...NOT_DELETED });
    return Boolean(found);
  }

  public async existsByUserId(userId: string): Promise<boolean> {
    const found = await ProfileModel.exists({
      userId: new Types.ObjectId(userId),
      ...NOT_DELETED,
    });
    return Boolean(found);
  }

  public async create(
    input: CreateProfileInput,
  ): Promise<HydratedDocument<IProfile>> {
    return ProfileModel.create(input);
  }

  public async findCandidates(
    filters: ProfileSearchFilters,
    limit: number,
  ): Promise<Array<HydratedDocument<IProfile>>> {
    return ProfileModel.find(buildSearchQuery(filters))
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  public async search(
    filters: ProfileSearchFilters,
    page: number,
    limit: number,
  ): Promise<{ items: Array<HydratedDocument<IProfile>>; total: number }> {
    const safePage = Math.max(page || 1, 1);
    const safeLimit = Math.max(limit || 10, 1);
    const skip = (safePage - 1) * safeLimit;
    const query = buildSearchQuery(filters);

    const [items, total] = await Promise.all([
      ProfileModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      ProfileModel.countDocuments(query),
    ]);

    return { items, total };
  }
}

export const profileService = Container.get(ProfileService);
