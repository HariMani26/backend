import { Schema, Types, model } from 'mongoose';

export interface IConversation { pairKey: string; participants: Types.ObjectId[]; updatedAt: Date; }
const conversationSchema = new Schema<IConversation>({
  pairKey: { type: String, required: true, unique: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
}, { timestamps: true });
conversationSchema.index({ participants: 1, updatedAt: -1 });
export const ConversationModel = model<IConversation>('Conversation', conversationSchema);

export interface IMessage { conversationId: Types.ObjectId; senderId: Types.ObjectId; clientId: string; text: string; readAt?: Date; createdAt: Date; }
const messageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: String, required: true }, text: { type: String, required: true, maxlength: 4000 }, readAt: Date,
}, { timestamps: true });
messageSchema.index({ conversationId: 1, _id: -1 });
messageSchema.index({ senderId: 1, clientId: 1 }, { unique: true });
export const MessageModel = model<IMessage>('Message', messageSchema);