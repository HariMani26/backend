import { HydratedDocument, Types } from "mongoose";

import { IProfile } from "@models/Profile.model";
import { UserModel } from "@models/User.model";
import {
    BlobContainerKey,
    blobStorageService,
} from "@services/blobStorage.service";
import { uploadedFileService } from "@services/uploadedFile.service";

/** Resolves each profile's primary photo to a signed thumbnail URL, batched in one query. */
export async function resolvePrimaryPhotoUrls(
  profiles: Array<HydratedDocument<IProfile>>,
): Promise<Map<string, string>> {
  const photoIds = profiles
    .map((profile) => profile.primaryPhotoId)
    .filter((id): id is Types.ObjectId => !!id);
  if (photoIds.length === 0) {
    return new Map();
  }

  const owners = await UserModel.find({
    _id: { $in: profiles.map((profile) => profile.userId) },
    isActive: true, isDeleted: { $ne: true }, 'preferences.showPhoto': { $ne: false },
  }).select('_id');
  const allowedOwners = new Set(owners.map((owner) => String(owner._id)));
  const files = (await uploadedFileService.findManyByIds(photoIds)).filter((file) =>
    allowedOwners.has(String(file.userId)) && ['profile-image', 'gallery'].includes(file.type) &&
    profiles.some((profile) => String(profile.userId) === String(file.userId) && String(profile.primaryPhotoId) === String(file._id)),
  );
  const entries = await Promise.all(
    files.map(async (file) => {
      const container = file.container as BlobContainerKey;
      const blobName = file.thumbnailBlobName ?? file.blobName;
      const url = await blobStorageService.generateReadSasUrl(
        container,
        blobName,
      );
      return [String(file._id), url] as const;
    }),
  );
  return new Map(entries);
}
