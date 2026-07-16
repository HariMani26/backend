import { Schema } from 'mongoose';

const creatorBaseSchema: Schema = new Schema({
  createdBy: { type: String, ref: 'user' },
  updatedBy: { type: String, ref: 'user' },
  createdAt: { type: Date },
  updatedAt: { type: Date, index: true },
});

export { creatorBaseSchema };

