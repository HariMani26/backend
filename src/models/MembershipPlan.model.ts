import { Schema, model } from 'mongoose';

export interface IMembershipPlan {
  name: string;
  priceInr: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
}

const membershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: { type: String, required: true, trim: true },
    priceInr: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const MembershipPlanModel = model<IMembershipPlan>('MembershipPlan', membershipPlanSchema);
