import { randomUUID } from "crypto";

import {
  AZURE_CONTAINER_CHAT_IMAGES,
  AZURE_CONTAINER_DOCUMENTS,
  AZURE_CONTAINER_HOROSCOPE,
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
  AZURE_STORAGE_CONTAINER_PHOTOS,
  AZURE_STORAGE_CONTAINER_FILES,
} from "@/config";
import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import sharp from "sharp";

import {
  AZURE_CONTAINER_GALLERY,
  AZURE_CONTAINER_PROFILE_IMAGES,
  AZURE_CONTAINER_TEMP,
} from "@/config";
import { ApiError } from "@utils/ApiError";
import { Container, Service } from "typedi";

export type BlobContainerKey =
  | "profile-images"
  | "gallery"
  | "horoscope"
  | "documents"
  | "chat-images"
  | "temp";

const CONTAINER_NAMES: Record<BlobContainerKey, string> = {
  "profile-images": AZURE_CONTAINER_PROFILE_IMAGES || "profile-images",
  gallery: AZURE_CONTAINER_GALLERY || "gallery",
  horoscope: AZURE_CONTAINER_HOROSCOPE || "horoscope",
  documents: AZURE_CONTAINER_DOCUMENTS || "documents",
  "chat-images": AZURE_CONTAINER_CHAT_IMAGES || "chat-images",
  temp: AZURE_CONTAINER_TEMP || "temp",
};

// Photos live in one private container, non-image files in another.
const PHOTO_KEYS = new Set<BlobContainerKey>([
  "profile-images",
  "gallery",
  "horoscope",
  "chat-images",
]);
const FILE_KEYS = new Set<BlobContainerKey>(["documents", "temp"]);

function resolveContainerName(key: BlobContainerKey): string {
  if (PHOTO_KEYS.has(key) && AZURE_STORAGE_CONTAINER_PHOTOS) {
    return AZURE_STORAGE_CONTAINER_PHOTOS;
  }
  if (FILE_KEYS.has(key) && AZURE_STORAGE_CONTAINER_FILES) {
    return AZURE_STORAGE_CONTAINER_FILES;
  }
  return AZURE_STORAGE_CONTAINER_NAME || CONTAINER_NAMES[key];
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// Per CLAUDE.md File Upload limits.
const MAX_SIZE_BYTES: Partial<Record<BlobContainerKey, number>> = {
  "profile-images": 5 * 1024 * 1024,
  gallery: 10 * 1024 * 1024,
  documents: 20 * 1024 * 1024,
};

let cachedServiceClient: BlobServiceClient | null = null;

function getServiceClient(): BlobServiceClient {
  if (cachedServiceClient) {
    return cachedServiceClient;
  }
  if (AZURE_STORAGE_ACCOUNT_NAME) {
    if (!/^[a-z0-9]{3,24}$/.test(AZURE_STORAGE_ACCOUNT_NAME)) {
      throw ApiError.internal("AZURE_STORAGE_ACCOUNT_NAME must be a valid Azure storage account name");
    }
    cachedServiceClient = new BlobServiceClient(
      `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      new DefaultAzureCredential(),
    );
  } else if (AZURE_STORAGE_CONNECTION_STRING) {
    cachedServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING,
    );
  } else {
    throw ApiError.internal(
      "Azure Blob Storage is not configured (set AZURE_STORAGE_ACCOUNT_NAME for managed identity or AZURE_STORAGE_CONNECTION_STRING)",
    );
  }
  return cachedServiceClient;
}

async function getContainerClient(
  key: BlobContainerKey,
): Promise<ContainerClient> {
  const client = getServiceClient().getContainerClient(resolveContainerName(key));
  // No `access` option => private container. Reads go through generateReadSasUrl, never anonymous.
  await client.createIfNotExists();
  return client;
}

function extensionForDocument(mimeType: string): string {
  return mimeType === "application/pdf" ? "pdf" : "docx";
}

async function putBuffer(
  client: ContainerClient,
  blobName: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await client
    .getBlockBlobClient(blobName)
    .uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
}

export interface UploadResult {
  /** The semantic container key (e.g. "profile-images"), not the resolved Azure container name — callers persist this and pass it back into deleteBlob/generateReadSasUrl, which resolve the actual name via CONTAINER_NAMES. */
  container: BlobContainerKey;
  blobName: string;
  thumbnailBlobName?: string;
  sizeBytes: number;
  mimeType: string;
}

function assertImageAllowed(
  container: BlobContainerKey,
  mimeType: string,
  sizeBytes: number,
): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw ApiError.badRequest("Only JPG, PNG, and WEBP images are allowed");
  }
  const max = MAX_SIZE_BYTES[container];
  if (max && sizeBytes > max) {
    throw ApiError.badRequest(
      `File exceeds the ${Math.round(max / (1024 * 1024))}MB limit for this upload type`,
    );
  }
}

function assertDocumentAllowed(
  container: BlobContainerKey,
  mimeType: string,
  sizeBytes: number,
): void {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    throw ApiError.badRequest("Only PDF and DOCX documents are allowed");
  }
  const max = MAX_SIZE_BYTES[container];
  if (max && sizeBytes > max) {
    throw ApiError.badRequest(
      `File exceeds the ${Math.round(max / (1024 * 1024))}MB limit for this upload type`,
    );
  }
}

@Service()
export class BlobStorageService {
  /** Strips EXIF, resizes, converts to WebP, and generates a thumbnail — per CLAUDE.md Image Processing rules. */
  public assertImageAllowed(
    container: BlobContainerKey,
    mimeType: string,
    sizeBytes: number,
  ): void {
    assertImageAllowed(container, mimeType, sizeBytes);
  }

  public assertDocumentAllowed(
    container: BlobContainerKey,
    mimeType: string,
    sizeBytes: number,
  ): void {
    assertDocumentAllowed(container, mimeType, sizeBytes);
  }

  public async uploadImage(params: {
    userId: string;
    container: BlobContainerKey;
    buffer: Buffer;
    mimeType: string;
  }): Promise<UploadResult> {
    assertImageAllowed(params.container, params.mimeType, params.buffer.length);

    const client = await getContainerClient(params.container);
    const id = randomUUID();
    const blobName = `${params.userId}/${id}.webp`;
    const thumbnailBlobName = `${params.userId}/${id}_thumb.webp`;

    // .rotate() with no args applies EXIF orientation then sharp strips metadata by default on output.
    const optimized = await sharp(params.buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const thumbnail = await sharp(params.buffer)
      .rotate()
      .resize({ width: 300, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    await putBuffer(client, blobName, optimized, "image/webp");
    await putBuffer(client, thumbnailBlobName, thumbnail, "image/webp");

    return {
      container: params.container,
      blobName,
      thumbnailBlobName,
      sizeBytes: optimized.length,
      mimeType: "image/webp",
    };
  }

  public async uploadDocument(params: {
    userId: string;
    container: BlobContainerKey;
    buffer: Buffer;
    mimeType: string;
  }): Promise<UploadResult> {
    assertDocumentAllowed(
      params.container,
      params.mimeType,
      params.buffer.length,
    );

    const client = await getContainerClient(params.container);
    const blobName = `${params.userId}/${randomUUID()}.${extensionForDocument(params.mimeType)}`;

    await putBuffer(client, blobName, params.buffer, params.mimeType);

    return {
      container: params.container,
      blobName,
      sizeBytes: params.buffer.length,
      mimeType: params.mimeType,
    };
  }

  public async deleteBlob(
    container: BlobContainerKey,
    blobName: string,
  ): Promise<void> {
    const client = await getContainerClient(container);
    await client.getBlockBlobClient(blobName).deleteIfExists();
  }

  /** Private containers only — every read goes through a short-lived SAS URL, never anonymous access. */
  public async generateReadSasUrl(
    container: BlobContainerKey,
    blobName: string,
    expiryMinutes = 60,
  ): Promise<string> {
    const client = await getContainerClient(container);
    const blobClient = client.getBlockBlobClient(blobName);
    const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);
    if (AZURE_STORAGE_ACCOUNT_NAME) {
      const startsOn = new Date(Date.now() - 5 * 60 * 1000);
      const delegationKey = await getServiceClient().getUserDelegationKey(startsOn, expiresOn);
      const signature = generateBlobSASQueryParameters(
        { containerName: client.containerName, blobName, permissions: BlobSASPermissions.parse("r"), startsOn, expiresOn },
        delegationKey,
        AZURE_STORAGE_ACCOUNT_NAME,
      ).toString();
      return `${blobClient.url}?${signature}`;
    }
    return blobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    });
  }
}

export const blobStorageService = Container.get(BlobStorageService);
