import { IUploadedFile, UploadedFileType } from "@models/UploadedFile.model";
import {
    BlobContainerKey,
    blobStorageService,
} from "@services/blobStorage.service";
import { uploadedFileService } from "@services/uploadedFile.service";
import { ApiError } from "@utils/ApiError";

const MAX_PHOTOS_PER_USER = 5;

export interface IncomingFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const CONTAINER_BY_TYPE: Record<UploadedFileType, BlobContainerKey> = {
  "profile-image": "profile-images",
  gallery: "gallery",
  horoscope: "horoscope",
  document: "documents",
  "chat-image": "chat-images",
};

const IMAGE_TYPES: UploadedFileType[] = [
  "profile-image",
  "gallery",
  "horoscope",
  "chat-image",
];

async function assertPhotoQuotaAvailable(userId: string): Promise<void> {
  const existing = await uploadedFileService.countByUser(userId, [
    "profile-image",
    "gallery",
  ]);
  if (existing >= MAX_PHOTOS_PER_USER) {
    throw ApiError.badRequest(
      `You can upload a maximum of ${MAX_PHOTOS_PER_USER} photos`,
    );
  }
}

export const uploadService = {
  async uploadPhoto(
    userId: string,
    type: "profile-image" | "gallery",
    file: IncomingFile,
  ): Promise<IUploadedFile> {
    await assertPhotoQuotaAvailable(userId);

    const container = CONTAINER_BY_TYPE[type];
    const result = await blobStorageService.uploadImage({
      userId,
      container,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    if (type === "profile-image") {
      await uploadedFileService.unsetPrimaryForUser(userId, "profile-image");
    }

    return uploadedFileService.create({
      userId,
      type,
      container: result.container,
      blobName: result.blobName,
      thumbnailBlobName: result.thumbnailBlobName,
      originalName: file.originalname,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      isPrimary: type === "profile-image",
    });
  },

  async uploadHoroscope(
    userId: string,
    file: IncomingFile,
  ): Promise<IUploadedFile> {
    const container = CONTAINER_BY_TYPE.horoscope;
    const isImage = file.mimetype.startsWith("image/");

    const result = isImage
      ? await blobStorageService.uploadImage({
          userId,
          container,
          buffer: file.buffer,
          mimeType: file.mimetype,
        })
      : await blobStorageService.uploadDocument({
          userId,
          container,
          buffer: file.buffer,
          mimeType: file.mimetype,
        });

    return uploadedFileService.create({
      userId,
      type: "horoscope",
      container: result.container,
      blobName: result.blobName,
      thumbnailBlobName: result.thumbnailBlobName,
      originalName: file.originalname,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      isPrimary: false,
    });
  },

  async uploadDocument(
    userId: string,
    file: IncomingFile,
  ): Promise<IUploadedFile> {
    const container = CONTAINER_BY_TYPE.document;
    const result = await blobStorageService.uploadDocument({
      userId,
      container,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    return uploadedFileService.create({
      userId,
      type: "document",
      container: result.container,
      blobName: result.blobName,
      originalName: file.originalname,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      isPrimary: false,
    });
  },

  async replaceFile(
    userId: string,
    fileId: string,
    file: IncomingFile,
  ): Promise<IUploadedFile> {
    const existing = await uploadedFileService.findById(fileId);
    if (!existing || String(existing.userId) !== userId) {
      throw ApiError.notFound("File not found");
    }

    const container = existing.container as BlobContainerKey;
    const isImage = IMAGE_TYPES.includes(existing.type);

    await blobStorageService.deleteBlob(container, existing.blobName);
    if (existing.thumbnailBlobName) {
      await blobStorageService.deleteBlob(
        container,
        existing.thumbnailBlobName,
      );
    }

    const result = isImage
      ? await blobStorageService.uploadImage({
          userId,
          container,
          buffer: file.buffer,
          mimeType: file.mimetype,
        })
      : await blobStorageService.uploadDocument({
          userId,
          container,
          buffer: file.buffer,
          mimeType: file.mimetype,
        });

    const updated = await uploadedFileService.replaceContent(fileId, {
      blobName: result.blobName,
      thumbnailBlobName: result.thumbnailBlobName,
      originalName: file.originalname,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
    });

    if (!updated) {
      throw ApiError.notFound("File not found");
    }
    return updated;
  },

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const existing = await uploadedFileService.findById(fileId);
    if (!existing || String(existing.userId) !== userId) {
      throw ApiError.notFound("File not found");
    }

    const container = existing.container as BlobContainerKey;
    await blobStorageService.deleteBlob(container, existing.blobName);
    if (existing.thumbnailBlobName) {
      await blobStorageService.deleteBlob(
        container,
        existing.thumbnailBlobName,
      );
    }

    await uploadedFileService.softDelete(fileId);
  },

  async listUserPhotos(
    userId: string,
  ): Promise<Array<IUploadedFile & { url: string; thumbnailUrl?: string }>> {
    const files = await uploadedFileService.findByUser(userId);
    return Promise.all(
      files.map(async (fileDoc) => {
        const container = fileDoc.container as BlobContainerKey;
        const url = await blobStorageService.generateReadSasUrl(
          container,
          fileDoc.blobName,
        );
        const thumbnailUrl = fileDoc.thumbnailBlobName
          ? await blobStorageService.generateReadSasUrl(
              container,
              fileDoc.thumbnailBlobName,
            )
          : undefined;
        return Object.assign(fileDoc.toObject(), { url, thumbnailUrl });
      }),
    );
  },
};
