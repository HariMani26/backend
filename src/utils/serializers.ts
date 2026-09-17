import { HydratedDocument } from 'mongoose';

import { Gender, IProfile, MaritalStatus, ProfileType, VerificationStatus } from '@models/Profile.model';
import { IUser } from '@models/User.model';
import { calculateAge } from '@utils/age';

export interface PublicUser {
  id: string;
  mobile: string;
  countryCode: string;
  email?: string;
  role: IUser['role'];
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
}

/** Never serialize a raw Mongoose user document over the wire — this is the one allowed shape. */
export function toPublicUser(user: HydratedDocument<IUser>): PublicUser {
  return {
    id: String(user._id),
    mobile: user.mobile,
    countryCode: user.countryCode,
    email: user.email,
    role: user.role,
    isPhoneVerified: user.isPhoneVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

export type PublicProfile = Omit<IProfile, 'userId' | 'isDeleted' | 'deletedAt' | 'createdBy' | 'updatedBy'> & {
  id: string;
  userId: string;
};

/** Never serialize a raw Mongoose profile document over the wire — this is the one allowed shape. */
export function toPublicProfile(profile: HydratedDocument<IProfile>): PublicProfile {
  const { isDeleted: _isDeleted, deletedAt: _deletedAt, createdBy: _createdBy, updatedBy: _updatedBy, ...rest } = profile.toObject();
  return {
    ...rest,
    id: String(profile._id),
    userId: String(profile.userId),
  };
}

/** Search/match-result card shape — deliberately excludes contact fields (whatsapp/email/address) regardless of viewer access. */
export interface ProfileSummary {
  id: string;
  referenceId: string;
  name: string;
  age: number;
  gender: Gender;
  profileType: ProfileType;
  heightCm: number;
  maritalStatus: MaritalStatus;
  district: string;
  state: string;
  education: string;
  occupation: string;
  kulam: string;
  rasi: string;
  star: string;
  verificationStatus: VerificationStatus;
  photoUrl?: string;
}

export function toProfileSummary(profile: HydratedDocument<IProfile>, photoUrl?: string): ProfileSummary {
  return {
    id: String(profile._id),
    referenceId: profile.referenceId,
    name: profile.name,
    age: calculateAge(profile.dob),
    gender: profile.gender,
    profileType: profile.profileType,
    heightCm: profile.heightCm,
    maritalStatus: profile.maritalStatus,
    district: profile.district,
    state: profile.state,
    education: profile.education,
    occupation: profile.occupation,
    kulam: profile.kulam,
    rasi: profile.rasi,
    star: profile.star,
    verificationStatus: profile.verificationStatus,
    photoUrl,
  };
}

/**
 * Full profile detail view for `GET /profiles/:id`. Contact fields (whatsapp/email/
 * exact address components) are only populated when the caller is viewing their own
 * profile or is an admin — nobody else has "paid access" yet since Subscriptions
 * (Phase E) don't exist. `hasFullAccess` tells the frontend which state it's in.
 */
export type ProfileDetail = ProfileSummary & {
  hasFullAccess: boolean;
  whatsapp?: string;
  email?: string;
  taluk?: string;
  nativePlace?: string;
  currentCountry?: string;
  currentCity?: string;
  company?: string;
  annualIncome?: string;
  workLocation?: string;
  fatherName?: string;
  motherName?: string;
  siblings?: string;
  familyType?: IProfile['familyType'];
  otherDetails?: string;
  photoUrls: string[];
};

export function toProfileDetail(
  profile: HydratedDocument<IProfile>,
  options: { hasFullAccess: boolean; photoUrls: string[]; showContact?: boolean },
): ProfileDetail {
  const summary = toProfileSummary(profile, options.hasFullAccess ? options.photoUrls[0] : undefined);
  const contactFields = options.hasFullAccess
    ? {
        ...(options.showContact !== false ? {
          whatsapp: profile.whatsapp, email: profile.email, taluk: profile.taluk,
          nativePlace: profile.nativePlace, currentCountry: profile.currentCountry, currentCity: profile.currentCity,
        } : {}),
        company: profile.company,
        annualIncome: profile.annualIncome,
        workLocation: profile.workLocation,
        fatherName: profile.fatherName,
        motherName: profile.motherName,
        siblings: profile.siblings,
        familyType: profile.familyType,
        otherDetails: profile.otherDetails,
      }
    : {};

  return {
    ...summary,
    hasFullAccess: options.hasFullAccess,
    photoUrls: options.hasFullAccess ? options.photoUrls : [],
    ...contactFields,
  };
}
