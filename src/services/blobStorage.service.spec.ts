import "reflect-metadata";
import sharp from "sharp";

jest.mock("@/config", () => ({
  AZURE_STORAGE_CONNECTION_STRING: "test-connection",
  AZURE_STORAGE_CONTAINER_NAME: undefined,
  AZURE_STORAGE_CONTAINER_PHOTOS: "photos",
  AZURE_STORAGE_CONTAINER_FILES: "files",
  AZURE_STORAGE_ACCOUNT_NAME: undefined,
}));

jest.mock("@azure/identity", () => ({ DefaultAzureCredential: jest.fn() }));

jest.mock("@azure/storage-blob", () => ({
  BlobServiceClient: Object.assign(jest.fn(), { fromConnectionString: jest.fn() }),
  BlobSASPermissions: { parse: jest.fn().mockReturnValue("r") },
  generateBlobSASQueryParameters: jest.fn().mockReturnValue({ toString: () => "sig=delegated" }),
}));

import { BlobServiceClient } from "@azure/storage-blob";
import { BlobStorageService } from "./blobStorage.service";

describe("split private photos/files containers", () => {
  const uploadData = jest.fn().mockResolvedValue(undefined);
  const deleteIfExists = jest.fn().mockResolvedValue(undefined);
  const generateSasUrl = jest.fn().mockResolvedValue("https://storage/read?sig=test");
  const getBlockBlobClient = jest.fn().mockReturnValue({ uploadData, deleteIfExists, generateSasUrl });
  const createIfNotExists = jest.fn().mockResolvedValue(undefined);
  const getContainerClient = jest.fn().mockReturnValue({ createIfNotExists, getBlockBlobClient });
  const service = new BlobStorageService();

  beforeEach(() => {
    jest.clearAllMocks();
    (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue({ getContainerClient });
  });

  it("uploads a photo and thumbnail into the private photos container", async () => {
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    const result = await service.uploadImage({ userId: "member", container: "profile-images", buffer, mimeType: "image/png" });

    expect(getContainerClient).toHaveBeenCalledWith("photos");
    expect(createIfNotExists).toHaveBeenCalledWith();
    expect(uploadData).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expect.objectContaining({ container: "profile-images", mimeType: "image/webp", thumbnailBlobName: expect.stringMatching(/_thumb\.webp$/) }));
  });

  it("uploads documents into the private files container with their content type", async () => {
    const buffer = Buffer.from("%PDF-1.7 test");
    const result = await service.uploadDocument({ userId: "member", container: "documents", buffer, mimeType: "application/pdf" });

    expect(getContainerClient).toHaveBeenCalledWith("files");
    expect(uploadData).toHaveBeenCalledWith(buffer, { blobHTTPHeaders: { blobContentType: "application/pdf" } });
    expect(result).toEqual(expect.objectContaining({ container: "documents", sizeBytes: buffer.length, blobName: expect.stringMatching(/\.pdf$/) }));
  });

  it("routes chat-images and horoscope into photos, and temp into files", async () => {
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).png().toBuffer();
    await service.uploadImage({ userId: "member", container: "chat-images", buffer: image, mimeType: "image/png" });
    await service.uploadDocument({ userId: "member", container: "temp", buffer: Buffer.from("%PDF-1.7 x"), mimeType: "application/pdf" });

    expect(getContainerClient).toHaveBeenNthCalledWith(1, "photos");
    expect(getContainerClient).toHaveBeenNthCalledWith(2, "files");
  });

  it("resolves metadata category keys to their private container for reads and deletes", async () => {
    await service.generateReadSasUrl("documents", "member/file.pdf");
    await service.deleteBlob("profile-images", "member/photo.webp");

    expect(getContainerClient.mock.calls).toEqual([["files"], ["photos"]]);
    expect(generateSasUrl).toHaveBeenCalledWith({ permissions: "r", expiresOn: expect.any(Date) });
    expect(deleteIfExists).toHaveBeenCalledTimes(1);
  });

  it("uses Entra credentials and a read-only user delegation SAS when an account name is configured", async () => {
    let identityService: BlobStorageService;
    const getUserDelegationKey = jest.fn().mockResolvedValue({ signedOid: "identity" });
    jest.isolateModules(() => {
      const configuration = require("@/config");
      configuration.AZURE_STORAGE_ACCOUNT_NAME = "materuploads2026";
      const sdk = require("@azure/storage-blob");
      sdk.BlobServiceClient.mockImplementation(() => ({
        getUserDelegationKey,
        getContainerClient: jest.fn().mockReturnValue({
          containerName: "photos",
          createIfNotExists,
          getBlockBlobClient: jest.fn().mockReturnValue({ url: "https://materuploads2026.blob.core.windows.net/photos/member/photo.webp" }),
        }),
      }));
      identityService = new (require("./blobStorage.service").BlobStorageService)();
    });

    const url = await identityService!.generateReadSasUrl("profile-images", "member/photo.webp");
    expect(url).toBe("https://materuploads2026.blob.core.windows.net/photos/member/photo.webp?sig=delegated");
    expect(getUserDelegationKey).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
    const sdk = require("@azure/storage-blob");
    expect(sdk.BlobServiceClient).toHaveBeenCalledWith("https://materuploads2026.blob.core.windows.net", expect.any(Object));
    expect(sdk.generateBlobSASQueryParameters).toHaveBeenCalledWith(
      expect.objectContaining({ containerName: "photos", blobName: "member/photo.webp", permissions: "r" }),
      { signedOid: "identity" },
      "materuploads2026",
    );
    require("@/config").AZURE_STORAGE_ACCOUNT_NAME = undefined;
  });
});