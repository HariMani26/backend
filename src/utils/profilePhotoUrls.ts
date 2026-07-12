import { HydratedDocument, Types } from 'mongoose';

import { IProfile } from '@models/Profile.model';
import { uploadedFileRepository } from '@repositories/uploadedFile.repository';
import { BlobContainerKey, blobStorageService } from '@services/blobStorage.service';

/** Resolves each profile's primary photo to a signed thumbnail URL, batched in one query. */
export async function resolvePrimaryPhotoUrls(profiles: Array<HydratedDocument<IProfile>>): Promise<Map<string, string>> {
  const photoIds = profiles.map((profile) => profile.primaryPhotoId).filter((id): id is Types.ObjectId => !!id);
  if (photoIds.length === 0) {
    return new Map();
  }

  const files = await uploadedFileRepository.findManyByIds(photoIds);
  const entries = await Promise.all(
    files.map(async (file) => {
      const container = file.container as BlobContainerKey;
      const blobName = file.thumbnailBlobName ?? file.blobName;
      const url = await blobStorageService.generateReadSasUrl(container, blobName);
      return [String(file._id), url] as const;
    }),
  );
  return new Map(entries);
}
