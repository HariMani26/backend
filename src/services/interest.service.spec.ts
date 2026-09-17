import 'reflect-metadata';
import { ProfileModel } from '@models/Profile.model';
import { InterestModel } from '@models/Interest.model';
import { profileService } from './profile.service';
import { interestService } from './interest.service';

describe('Interest permissions', () => {
  afterEach(() => jest.restoreAllMocks());
  it('does not allow unregistered users to send interest', async () => {
    jest.spyOn(profileService, 'findByUserId').mockResolvedValue(null);
    await expect(interestService.send('user-id', 'profile-id')).rejects.toThrow('Complete registration');
  });
  it('does not allow an unverified member to send interest', async () => {
    jest.spyOn(profileService, 'findByUserId').mockResolvedValue(new ProfileModel({ verificationStatus: 'unverified', accessTill: new Date(Date.now() + 86400000) }));
    await expect(interestService.send('user-id', 'profile-id')).rejects.toThrow('active verified membership');
  });
  it('rejects self-interest', async () => {
    const profile = new ProfileModel({ userId: '507f1f77bcf86cd799439011', verificationStatus: 'verified', accessTill: new Date(Date.now() + 86400000) });
    jest.spyOn(profileService, 'findByUserId').mockResolvedValue(profile);
    jest.spyOn(profileService, 'findPublicById').mockResolvedValue(profile);
    await expect(interestService.send(String(profile.userId), String(profile._id))).rejects.toThrow('yourself');
  });
  it('restricts marking interests read to the receiving user', async () => {
    const update = jest.spyOn(InterestModel, 'updateOne').mockResolvedValue({ acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null });
    await expect(interestService.markRead('caller-id', 'interest-id')).rejects.toThrow('Interest not found');
    expect(update).toHaveBeenCalledWith({ _id: 'interest-id', receiverUserId: 'caller-id' }, expect.anything());
  });
});