import { Schema, Types, model } from 'mongoose';

/** Autosaved partial wizard state for a signed-in-but-not-yet-registered user. Discarded once submitFull succeeds. */
export interface IRegistrationDraft {
  userId: Types.ObjectId;
  data: Record<string, unknown>;
}

const registrationDraftSchema = new Schema<IRegistrationDraft>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const RegistrationDraftModel = model<IRegistrationDraft>('RegistrationDraft', registrationDraftSchema);
