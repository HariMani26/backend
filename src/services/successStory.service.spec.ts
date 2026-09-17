import 'reflect-metadata';
import { ProfileModel } from '@models/Profile.model';
import { uploadedFileService } from './uploadedFile.service';
import { successStoryService } from './successStory.service';

describe('Published story privacy', () => {
  const profile = new ProfileModel({
    userId: '507f1f77bcf86cd799439011',
    marriageStatus: { consentForTestimonial: true, consentForPhotos: false, storyStatus: 'published' },
    successStory: {
      title: 'Our Story', titleTa: 'Our Story', summary: 'Summary', summaryTa: 'Summary',
      fullStory: 'Full story', fullStoryTa: 'Full story',
      showNames: false, showLocation: false, brideName: 'Private bride', groomName: 'Private groom', location: 'Private location',
      photoIds: ['507f1f77bcf86cd799439012'], videoUrl: 'https://example.com/private-video',
    },
  });

  afterEach(() => jest.restoreAllMocks());

  it('respects names, location and photo consent in public responses', async () => {
    const files = jest.spyOn(uploadedFileService, 'findManyByIds');
    const result = await successStoryService.serialize(profile, true);
    expect(result).not.toHaveProperty('brideName');
    expect(result).not.toHaveProperty('location');
    expect(result.photoUrls).toEqual([]);
    expect(result.videoUrl).toBeUndefined();
    expect(files).not.toHaveBeenCalled();
  });

  it('omits full story text from list summaries', async () => {
    expect(await successStoryService.serialize(profile)).not.toHaveProperty('fullStory');
  });

  it('uses publication and consent restrictions when loading a detail', async () => {
    const lookup = jest.spyOn(ProfileModel, 'findOneAndUpdate').mockResolvedValue(null);
    await expect(successStoryService.detail(String(profile._id))).rejects.toThrow('Story not found');
    expect(lookup).toHaveBeenCalledWith(expect.objectContaining({
      'marriageStatus.storyStatus': 'published',
      'marriageStatus.consentForTestimonial': true,
      isDeleted: { $ne: true },
    }), expect.anything(), { new: true });
  });
});