import { Schema, Types, model } from 'mongoose';

export interface IPartnerPreference {
  userId: Types.ObjectId;
  ageMin: number;
  ageMax: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  preferredKulams: string[];
  preferredDistricts: string[];
  preferredEducation: string[];
  preferredJobs: string[];
  isDeleted: boolean;
  deletedAt?: Date;
}

const partnerPreferenceSchema = new Schema<IPartnerPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    ageMin: { type: Number, required: true, min: 18, max: 100, default: 21 },
    ageMax: { type: Number, required: true, min: 18, max: 100, default: 31 },
    heightMinCm: { type: Number, min: 100, max: 250 },
    heightMaxCm: { type: Number, min: 100, max: 250 },
    preferredKulams: [{ type: String, trim: true, lowercase: true }],
    preferredDistricts: [{ type: String, trim: true }],
    preferredEducation: [{ type: String, trim: true }],
    preferredJobs: [{ type: String, trim: true }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

export const PartnerPreferenceModel = model<IPartnerPreference>('PartnerPreference', partnerPreferenceSchema);
