import { HydratedDocument, Types } from "mongoose";

import { IProfile } from "@models/Profile.model";
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

  const files = await uploadedFileService.findManyByIds(photoIds);
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
