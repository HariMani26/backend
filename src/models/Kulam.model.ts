import { Schema, model } from 'mongoose';

/**
 * Kulam reference list — canonical values confirmed with product owner to be the
 * registration-form list (Dheppalu, Orsulu, ...), NOT the Sanskrit-gotra names used
 * by the original prototype's matching matrix. See Phase 2 plan, "Key decision".
 */
export interface IKulam {
  valueEn: string;
  labelEn: string;
  labelTa: string;
}

const kulamSchema = new Schema<IKulam>(
  {
    valueEn: { type: String, required: true, unique: true, trim: true, lowercase: true },
    labelEn: { type: String, required: true, trim: true },
    labelTa: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const KulamModel = model<IKulam>('Kulam', kulamSchema);
