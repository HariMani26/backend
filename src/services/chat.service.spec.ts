import { Types } from 'mongoose';
import { ConversationModel } from '@models/Conversation.model';
import { assertChatParticipant, chatService } from './chat.service';
import { messageBodySchema } from '../routes/chat.routes';

describe('Chat authorization', () => {
  afterEach(() => jest.restoreAllMocks());
  it('restricts conversations to their actual participants', () => {
    const participant = new Types.ObjectId();
    expect(() => assertChatParticipant([participant], String(participant))).not.toThrow();
    expect(() => assertChatParticipant([participant], String(new Types.ObjectId()))).toThrow('not found');
  });
  it('scopes message history lookups to the caller', async () => {
    const lookup = jest.spyOn(ConversationModel, 'findOne').mockResolvedValue(null);
    await expect(chatService.messages('caller', 'conversation')).rejects.toThrow('not found');
    expect(lookup).toHaveBeenCalledWith({ _id: 'conversation', participants: 'caller' });
  });
  it('rejects blank, oversized, and identity-injected messages', () => {
    const valid = { text: 'Hello', clientId: '550e8400-e29b-41d4-a716-446655440000' };
    expect(messageBodySchema.safeParse(valid).success).toBe(true);
    expect(messageBodySchema.safeParse({ ...valid, text: '   ' }).success).toBe(false);
    expect(messageBodySchema.safeParse({ ...valid, text: 'x'.repeat(4001) }).success).toBe(false);
    expect(messageBodySchema.safeParse({ ...valid, senderId: 'someone-else' }).success).toBe(false);
  });
});