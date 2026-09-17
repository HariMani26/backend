import "reflect-metadata";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

jest.mock("@services/blobStorage.service", () => ({
  blobStorageService: { uploadImage: jest.fn(), uploadDocument: jest.fn() },
}));

import { UploadedFileModel } from "@models/UploadedFile.model";
import { blobStorageService } from "./blobStorage.service";
import { uploadService } from "./upload.service";

describe("upload metadata persistence", () => {
  let database: MongoMemoryServer;
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    database = await MongoMemoryServer.create();
    await mongoose.connect(database.getUri("upload_metadata_test"));
    await UploadedFileModel.init();
  }, 180000);

  beforeEach(async () => {
    jest.resetAllMocks();
    await UploadedFileModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await database?.stop();
  });

  it("saves photo and thumbnail metadata without file bytes or expiring URLs", async () => {
    (blobStorageService.uploadImage as jest.Mock).mockResolvedValue({
      container: "profile-images", blobName: `${userId}/photo.webp`,
      thumbnailBlobName: `${userId}/photo_thumb.webp`, sizeBytes: 42, mimeType: "image/webp",
    });
    const buffer = Buffer.from("photo bytes");
    await uploadService.uploadPhoto(userId, "profile-image", {
      buffer, mimetype: "image/png", originalname: "photo.png", size: buffer.length,
    });

    expect(blobStorageService.uploadImage).toHaveBeenCalledWith({ userId, container: "profile-images", buffer, mimeType: "image/png" });
    const saved = await UploadedFileModel.findOne({ userId }).lean();
    expect(saved).toMatchObject({
      type: "profile-image", container: "profile-images", blobName: `${userId}/photo.webp`,
      thumbnailBlobName: `${userId}/photo_thumb.webp`, originalName: "photo.png",
      sizeBytes: 42, mimeType: "image/webp", isPrimary: true, verificationStatus: "pending",
    });
    expect(saved).not.toHaveProperty("buffer");
    expect(saved).not.toHaveProperty("url");
  });

  it("saves document ownership, blob reference, filename, type and size", async () => {
    const buffer = Buffer.from("%PDF-1.7 test");
    (blobStorageService.uploadDocument as jest.Mock).mockResolvedValue({
      container: "documents", blobName: `${userId}/document.pdf`, sizeBytes: buffer.length, mimeType: "application/pdf",
    });
    await uploadService.uploadDocument(userId, {
      buffer, mimetype: "application/pdf", originalname: "certificate.pdf", size: buffer.length,
    });

    const saved = await UploadedFileModel.findOne({ userId }).lean();
    expect(String(saved?.userId)).toBe(userId);
    expect(saved).toMatchObject({
      type: "document", container: "documents", blobName: `${userId}/document.pdf`,
      originalName: "certificate.pdf", sizeBytes: buffer.length, mimeType: "application/pdf", isPrimary: false,
    });
    expect(saved).not.toHaveProperty("buffer");
  });

  it("does not save a database record when the blob upload fails", async () => {
    (blobStorageService.uploadDocument as jest.Mock).mockRejectedValue(new Error("Storage unavailable"));
    await expect(uploadService.uploadDocument(userId, {
      buffer: Buffer.from("document"), mimetype: "application/pdf", originalname: "certificate.pdf", size: 8,
    })).rejects.toThrow("Storage unavailable");
    expect(await UploadedFileModel.countDocuments()).toBe(0);
  });
});