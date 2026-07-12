import { FilterQuery, HydratedDocument, Types } from 'mongoose';

import { Gender, IProfile, ProfileModel } from '@models/Profile.model';
import { dobRangeForAgeFilter } from '@utils/age';

const NOT_DELETED = { isDeleted: { $ne: true } };
// Profiles an admin has explicitly rejected/suspended are excluded from search/matching by default.
const SEARCHABLE = { verificationStatus: { $nin: ['rejected', 'suspended'] } };

export interface ProfileSearchFilters {
  excludeUserId?: string | Types.ObjectId;
  name?: string;
  gender?: Gender;
  state?: string;
  district?: string;
  kulam?: string;
  ageFrom?: number;
  ageTo?: number;
}

export interface ProfileSearchPage {
  items: Array<HydratedDocument<IProfile>>;
  total: number;
}

export type CreateProfileInput = Omit<
  IProfile,
  'isDeleted' | 'deletedAt' | 'profileViews' | 'marriageStatus' | 'successStory' | 'userId'
> & { userId: Types.ObjectId | string };

function buildSearchQuery(filters: ProfileSearchFilters): FilterQuery<IProfile> {
  const query: FilterQuery<IProfile> = { ...NOT_DELETED, ...SEARCHABLE };

  if (filters.excludeUserId) {
    query.userId = { $ne: filters.excludeUserId };
  }
  if (filters.name) {
    query.name = { $regex: filters.name.trim(), $options: 'i' };
  }
  if (filters.gender) {
    query.gender = filters.gender;
  }
  if (filters.state) {
    query.state = { $regex: `^${filters.state.trim()}$`, $options: 'i' };
  }
  if (filters.district) {
    query.district = { $regex: `^${filters.district.trim()}$`, $options: 'i' };
  }
  if (filters.kulam) {
    query.kulam = filters.kulam.trim().toLowerCase();
  }

  const { minDob, maxDob } = dobRangeForAgeFilter(filters.ageFrom, filters.ageTo);
  if (minDob || maxDob) {
    query.dob = {};
    if (minDob) query.dob.$gte = minDob;
    if (maxDob) query.dob.$lte = maxDob;
  }

  return query;
}

export const profileRepository = {
  findByUserId(userId: string | Types.ObjectId) {
    return ProfileModel.findOne({ userId, ...NOT_DELETED });
  },

  findById(id: string | Types.ObjectId) {
    return ProfileModel.findOne({ _id: id, ...NOT_DELETED });
  },

  existsByUserId(userId: string | Types.ObjectId) {
    return ProfileModel.exists({ userId, ...NOT_DELETED });
  },

  existsByReferenceId(referenceId: string) {
    return ProfileModel.exists({ referenceId });
  },

  countAll() {
    return ProfileModel.countDocuments();
  },

  create(input: CreateProfileInput) {
    return ProfileModel.create(input);
  },

  async search(filters: ProfileSearchFilters, page: number, limit: number): Promise<ProfileSearchPage> {
    const query = buildSearchQuery(filters);

    const [items, total] = await Promise.all([
      ProfileModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ProfileModel.countDocuments(query),
    ]);

    return { items, total };
  },

  /** Unpaginated candidate pool for compatibility ranking (matches/top) — capped, no total count needed. */
  findCandidates(filters: ProfileSearchFilters, cap: number) {
    return ProfileModel.find(buildSearchQuery(filters)).limit(cap);
  },

  async findManyByIds(ids: Array<string | Types.ObjectId>) {
    return ProfileModel.find({ _id: { $in: ids }, ...NOT_DELETED, ...SEARCHABLE });
  },
};
