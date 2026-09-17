import { FilterQuery, HydratedDocument } from 'mongoose';
import { StoryQuery } from '@dto/successStory.dto';
import { IProfile, ProfileModel } from '@models/Profile.model';
import { ApiError } from '@utils/ApiError';
import { BlobContainerKey, blobStorageService } from './blobStorage.service';
import { uploadedFileService } from './uploadedFile.service';

const publishedStoryFilter: FilterQuery<IProfile> = {
  isDeleted: { $ne: true },
  'marriageStatus.storyStatus': 'published',
  'marriageStatus.consentForTestimonial': true,
  successStory: { $exists: true },
};

export class SuccessStoryService {
  async serialize(profile: HydratedDocument<IProfile>, detail = false) {
    const story = profile.successStory;
    if (!story) throw ApiError.notFound('Story not found');
    let photoUrls: string[] = [];
    if (profile.marriageStatus.consentForPhotos && story.photoIds.length) {
      const files = await uploadedFileService.findManyByIds(story.photoIds);
      const permittedFiles = files.filter((file) =>
        String(file.userId) === String(profile.userId) &&
        ['profile-image', 'gallery'].includes(file.type) && file.mimeType.startsWith('image/'),
      );
      const ordered = story.photoIds.flatMap((id) => permittedFiles.filter((file) => String(file._id) === String(id)));
      photoUrls = await Promise.all(ordered.map((file) =>
        blobStorageService.generateReadSasUrl(file.container as BlobContainerKey, file.blobName),
      ));
    }
    return {
      id: String(profile._id),
      title: story.title, titleTa: story.titleTa,
      summary: story.summary, summaryTa: story.summaryTa,
      ...(detail ? { fullStory: story.fullStory, fullStoryTa: story.fullStoryTa } : {}),
      ...(story.showNames ? { brideName: story.brideName, groomName: story.groomName } : {}),
      ...(story.showLocation ? { location: story.location } : {}),
      marriageDate: story.marriageDate, featured: story.featured, viewCount: story.viewCount,
      coverPhotoUrl: photoUrls[story.coverPhotoIndex] ?? photoUrls[0],
      ...(detail ? { photoUrls, videoUrl: profile.marriageStatus.consentForPhotos ? story.videoUrl : undefined } : {}),
    };
  }

  async list({ year, page, limit }: StoryQuery) {
    const filter: FilterQuery<IProfile> = { ...publishedStoryFilter };
    if (year) filter['successStory.marriageDate'] = {
      $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
    const [profiles, total, statistics] = await Promise.all([
      ProfileModel.find(filter).sort({ 'successStory.featured': -1, 'successStory.publishedDate': -1 }).skip((page - 1) * limit).limit(limit),
      ProfileModel.countDocuments(filter),
      ProfileModel.aggregate([
        { $match: publishedStoryFilter },
        { $group: {
          _id: null, couples: { $sum: 1 }, views: { $sum: '$successStory.viewCount' },
          years: { $addToSet: { $year: '$successStory.marriageDate' } },
        } },
      ]),
    ]);
    const stats = statistics[0];
    return {
      items: await Promise.all(profiles.map((profile) => this.serialize(profile))),
      total, page, limit,
      couples: stats?.couples ?? 0, views: stats?.views ?? 0,
      years: ((stats?.years ?? []) as number[]).filter(Number.isInteger).sort((first, second) => second - first),
    };
  }

  async detail(id: string) {
    const profile = await ProfileModel.findOneAndUpdate(
      { _id: id, ...publishedStoryFilter },
      { $inc: { 'successStory.viewCount': 1 } }, { new: true },
    );
    if (!profile) throw ApiError.notFound('Story not found');
    return this.serialize(profile, true);
  }
}

export const successStoryService = new SuccessStoryService();