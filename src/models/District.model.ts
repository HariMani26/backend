import { Schema, model } from 'mongoose';

export interface IDistrict {
  name: string;
  nameTa: string;
  state: string;
}

const districtSchema = new Schema<IDistrict>(
  {
    name: { type: String, required: true, trim: true },
    nameTa: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true },
);

districtSchema.index({ name: 1, state: 1 }, { unique: true });

export const DistrictModel = model<IDistrict>('District', districtSchema);
