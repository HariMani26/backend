import { Schema, Types, model } from 'mongoose';

export interface IInterest {
  senderUserId: Types.ObjectId;
  receiverUserId: Types.ObjectId;
  senderProfileId: Types.ObjectId;
  targetProfileId: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
}

const interestSchema = new Schema<IInterest>({
  senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderProfileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  targetProfileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  readAt: Date,
}, { timestamps: true });
interestSchema.index({ senderUserId: 1, receiverUserId: 1 }, { unique: true });
interestSchema.index({ receiverUserId: 1, createdAt: -1 });
export const InterestModel = model<IInterest>('Interest', interestSchema);