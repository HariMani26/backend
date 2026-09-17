import { Schema, Types, model } from 'mongoose';

export type Gender = 'male' | 'female';
export type ProfileType = 'bride' | 'groom';
export type MaritalStatus = 'never-married' | 'divorced' | 'widowed';
export type FamilyType = 'nuclear' | 'joint';
export type RegistrationType = 'quick' | 'full';
export type RelationToProfile = 'self' | 'father' | 'mother' | 'brother' | 'sister' | 'friend' | 'relative' | 'guardian' | 'other';

/**
 * Distinct from "phone/OTP verified" (User.isPhoneVerified) and "payment/subscription
 * active" (Subscription collection). This is admin/Aadhaar identity verification only —
 * see the Figma-source audit's access-control matrix. Do not conflate these three states.
 */
export type VerificationStatus = 'unverified' | 'verified' | 'rejected' | 'refunded' | 'suspended';

export type StoryStatus = 'none' | 'user-submitted' | 'published' | 'declined';

export interface IMarriageStatus {
  isMarried: boolean;
  marriedThroughPlatform?: boolean;
  partnerProfileId?: Types.ObjectId;
  marriageDate?: Date;
  marriageNotes?: string;
  consentForTestimonial?: boolean;
  consentForPhotos?: boolean;
  storyStatus: StoryStatus;
}

export interface ISuccessStory {
  title: string;
  titleTa: string;
  summary: string;
  summaryTa: string;
  fullStory: string;
  fullStoryTa: string;
  photoIds: Types.ObjectId[];
  coverPhotoIndex: number;
  videoUrl?: string;
  showNames: boolean;
  showLocation: boolean;
  brideName?: string;
  groomName?: string;
  location?: string;
  marriageDate?: Date;
  publishedDate?: Date;
  featured: boolean;
  viewCount: number;
}

export interface IProfile {
  userId: Types.ObjectId;
  referenceId: string;
  name: string;
  gender: Gender;
  profileType: ProfileType;
  dob: Date;
  heightCm: number;
  maritalStatus: MaritalStatus;
  registrationType: RegistrationType;
  registrarName: string;
  relationToProfile: RelationToProfile;

  whatsapp?: string;
  email?: string;
  state: string;
  district: string;
  taluk?: string;
  nativePlace?: string;
  currentCountry?: string;
  currentCity?: string;

  education: string;
  occupation: string;
  company?: string;
  annualIncome?: string;
  workLocation?: string;

  rasi: string;
  star: string;
  kulam: string;
  otherKulam?: string;
  caste?: string;

  fatherName?: string;
  motherName?: string;
  siblings?: string;
  familyType?: FamilyType;
  otherDetails?: string;

  verificationStatus: VerificationStatus;
  previousVerificationStatus?: Exclude<VerificationStatus, 'suspended'>;
  verificationReason?: string;
  accessTill?: Date;
  primaryPhotoId?: Types.ObjectId;
  profileViews: number;

  marriageStatus: IMarriageStatus;
  successStory?: ISuccessStory;

  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const marriageStatusSchema = new Schema<IMarriageStatus>(
  {
    isMarried: { type: Boolean, default: false },
    marriedThroughPlatform: { type: Boolean },
    partnerProfileId: { type: Schema.Types.ObjectId, ref: 'Profile' },
    marriageDate: { type: Date },
    marriageNotes: { type: String, trim: true },
    consentForTestimonial: { type: Boolean },
    consentForPhotos: { type: Boolean },
    storyStatus: { type: String, enum: ['none', 'user-submitted', 'published', 'declined'], default: 'none' },
  },
  { _id: false },
);

const successStorySchema = new Schema<ISuccessStory>(
  {
    title: { type: String, required: true, trim: true },
    titleTa: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    summaryTa: { type: String, required: true, trim: true },
    fullStory: { type: String, required: true },
    fullStoryTa: { type: String, required: true },
    photoIds: [{ type: Schema.Types.ObjectId, ref: 'UploadedFile' }],
    coverPhotoIndex: { type: Number, default: 0 },
    videoUrl: { type: String, trim: true },
    showNames: { type: Boolean, default: true },
    showLocation: { type: Boolean, default: true },
    brideName: { type: String, trim: true },
    groomName: { type: String, trim: true },
    location: { type: String, trim: true },
    marriageDate: { type: Date },
    publishedDate: { type: Date },
    featured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const profileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    referenceId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    profileType: { type: String, enum: ['bride', 'groom'], required: true },
    dob: { type: Date, required: true },
    heightCm: { type: Number, required: true, min: 100, max: 250 },
    maritalStatus: { type: String, enum: ['never-married', 'divorced', 'widowed'], required: true },
    registrationType: { type: String, enum: ['quick', 'full'], required: true },
    registrarName: { type: String, required: true, trim: true },
    relationToProfile: {
      type: String,
      enum: ['self', 'father', 'mother', 'brother', 'sister', 'friend', 'relative', 'guardian', 'other'],
      required: true,
    },

    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    state: { type: String, required: true, trim: true, default: 'Tamil Nadu' },
    district: { type: String, required: true, trim: true, index: true },
    taluk: { type: String, trim: true },
    nativePlace: { type: String, trim: true },
    currentCountry: { type: String, trim: true },
    currentCity: { type: String, trim: true },

    education: { type: String, required: true, trim: true },
    occupation: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    annualIncome: { type: String, trim: true },
    workLocation: { type: String, trim: true },

    rasi: { type: String, required: true, trim: true },
    star: { type: String, required: true, trim: true },
    kulam: { type: String, required: true, trim: true, lowercase: true, index: true },
    otherKulam: { type: String, trim: true },
    caste: { type: String, trim: true },

    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    siblings: { type: String, trim: true },
    familyType: { type: String, enum: ['nuclear', 'joint'] },
    otherDetails: { type: String, trim: true },

    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'rejected', 'refunded', 'suspended'],
      default: 'unverified',
      index: true,
    },
    verificationReason: { type: String, trim: true },
    previousVerificationStatus: { type: String, enum: ['unverified', 'verified', 'rejected', 'refunded'] },
    accessTill: { type: Date },
    primaryPhotoId: { type: Schema.Types.ObjectId, ref: 'UploadedFile' },
    profileViews: { type: Number, default: 0 },

    marriageStatus: { type: marriageStatusSchema, default: () => ({ isMarried: false, storyStatus: 'none' }) },
    successStory: { type: successStorySchema },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

profileSchema.index({ gender: 1, district: 1, kulam: 1 });
profileSchema.index({ 'marriageStatus.storyStatus': 1 });

export const ProfileModel = model<IProfile>('Profile', profileSchema);
