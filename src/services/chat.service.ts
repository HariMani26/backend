import { Types } from 'mongoose';
import { ConversationModel, MessageModel } from '@models/Conversation.model';
import { ProfileModel } from '@models/Profile.model';
import { NOT_DELETED, UserModel } from '@models/User.model';
import { ApiError } from '@utils/ApiError';
import { evaluateAccess } from './access.service';

export function assertChatParticipant(participants: Array<Types.ObjectId | string>, userId: string): void {
  if (!participants.some((participant) => String(participant) === userId)) throw ApiError.notFound('Conversation not found');
}

export class ChatService {
  private async canSend(userId: string): Promise<void> {
    const profile = await ProfileModel.findOne({ userId, ...NOT_DELETED });
    if (!evaluateAccess(profile).hasFullAccess || profile?.marriageStatus.isMarried) throw ApiError.forbidden('Active verified membership is required to chat');
  }

  async open(userId: string, profileId: string) {
    await this.canSend(userId);
    const target = await ProfileModel.findOne({ _id: profileId, ...NOT_DELETED, verificationStatus: 'verified', 'marriageStatus.isMarried': { $ne: true } });
    if (!target || !await UserModel.exists({ _id: target.userId, ...NOT_DELETED, isActive: true })) throw ApiError.notFound('Member unavailable');
    if (String(target.userId) === userId) throw ApiError.badRequest('You cannot chat with yourself');
    await this.canSend(String(target.userId));
    const participants = [userId, String(target.userId)].sort();
    const pairKey = participants.join(':');
    try {
      const conversation = await ConversationModel.findOneAndUpdate({ pairKey }, { $setOnInsert: { participants } }, { upsert: true, new: true });
      return { id: String(conversation!._id) };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await ConversationModel.findOne({ pairKey });
        if (existing) return { id: String(existing._id) };
      }
      throw error;
    }
  }

  private async conversation(userId: string, id: string) {
    const conversation = await ConversationModel.findOne({ _id: id, participants: userId });
    if (!conversation) throw ApiError.notFound('Conversation not found');
    assertChatParticipant(conversation.participants, userId);
    return conversation;
  }

  async list(userId: string, page: number) {
    const filter = { participants: userId };
    const [conversations, total] = await Promise.all([ConversationModel.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * 25).limit(25), ConversationModel.countDocuments(filter)]);
    const items = await Promise.all(conversations.map(async (conversation) => {
      const otherId = conversation.participants.find((participant) => String(participant) !== userId);
      const [profile, owner, unread] = await Promise.all([
        ProfileModel.findOne({ userId: otherId, ...NOT_DELETED }), UserModel.exists({ _id: otherId, ...NOT_DELETED, isActive: true }),
        MessageModel.countDocuments({ conversationId: conversation._id, senderId: { $ne: userId }, readAt: { $exists: false } }),
      ]);
      return { id: String(conversation._id), name: owner && profile ? profile.name : 'Member unavailable', profileId: owner && profile ? String(profile._id) : null, unread, updatedAt: conversation.updatedAt };
    }));
    return { items, total, page, limit: 25 };
  }

  async messages(userId: string, id: string, before?: string) {
    await this.conversation(userId, id);
    const messages = await MessageModel.find({ conversationId: id, ...(before ? { _id: { $lt: new Types.ObjectId(before) } } : {}) }).sort({ _id: -1 }).limit(51);
    const hasMore = messages.length > 50;
    const items = messages.slice(0, 50).reverse().map((message) => ({ id: String(message._id), mine: String(message.senderId) === userId, text: message.text, createdAt: message.createdAt, readAt: message.readAt ?? null }));
    return { items, hasMore };
  }

  async send(userId: string, id: string, text: string, clientId: string) {
    const conversation = await this.conversation(userId, id);
    await this.canSend(userId);
    const otherId = conversation.participants.find((participant) => String(participant) !== userId)!;
    if (!await UserModel.exists({ _id: otherId, ...NOT_DELETED, isActive: true })) throw ApiError.forbidden('Member unavailable');
    await this.canSend(String(otherId));
    const existing = await MessageModel.findOne({ senderId: userId, clientId });
    if (existing) {
      if (String(existing.conversationId) !== id || existing.text !== text) throw ApiError.conflict('Message retry does not match the original');
      return { id: String(existing._id) };
    }
    let message;
    try { message = await MessageModel.create({ conversationId: id, senderId: userId, text, clientId }); }
    catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      message = await MessageModel.findOne({ senderId: userId, clientId, conversationId: id, text });
      if (!message) throw ApiError.conflict('Message retry does not match the original');
    }
    await ConversationModel.updateOne({ _id: id }, { $set: { updatedAt: new Date() } });
    return { id: String(message._id) };
  }

  async read(userId: string, id: string, through: string) {
    await this.conversation(userId, id);
    await MessageModel.updateMany({ conversationId: id, _id: { $lte: new Types.ObjectId(through) }, senderId: { $ne: userId }, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  }
}
export const chatService = new ChatService();