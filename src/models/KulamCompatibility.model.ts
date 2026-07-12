import { Schema, model } from 'mongoose';

/**
 * Compatibility matrix consumed by MatchingService (Milestone 6). Seeded as a
 * structural PLACEHOLDER only — each kulam's excellent/good/average/avoid buckets
 * mirror the prototype's matrix shape, not authentic community pairings. Must be
 * reviewed and corrected with real data before this goes live (see Phase 2 plan).
 */
export interface IKulamCompatibility {
  kulam: string; // Kulam.valueEn
  excellent: string[];
  good: string[];
  average: string[];
  avoid: string[];
}

const kulamCompatibilitySchema = new Schema<IKulamCompatibility>(
  {
    kulam: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excellent: [{ type: String, trim: true, lowercase: true }],
    good: [{ type: String, trim: true, lowercase: true }],
    average: [{ type: String, trim: true, lowercase: true }],
    avoid: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true },
);

export const KulamCompatibilityModel = model<IKulamCompatibility>(
  'KulamCompatibility',
  kulamCompatibilitySchema,
);
