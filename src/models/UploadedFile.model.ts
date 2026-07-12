import { Schema, Types, model } from 'mongoose';

export type UploadedFileType = 'profile-image' | 'gallery' | 'horoscope' | 'document' | 'chat-image';
export type FileVerificationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Metadata-only record for a file stored in Azure Blob Storage. The binary itself
 * never touches MongoDB — see BlobStorageService for upload/delete/SAS generation.
 */
export interface IUploadedFile {
  userId: Types.ObjectId;
  type: UploadedFileType;
  container: string;
  blobName: string;
  thumbnailBlobName?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  verificationStatus: FileVerificationStatus;
  rejectionReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

const uploadedFileSchema = new Schema<IUploadedFile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['profile-image', 'gallery', 'horoscope', 'document', 'chat-image'], required: true, index: true },
    container: { type: String, required: true, trim: true },
    blobName: { type: String, required: true, unique: true, trim: true },
    thumbnailBlobName: { type: String, trim: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    isPrimary: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

uploadedFileSchema.index({ userId: 1, type: 1 });

export const UploadedFileModel = model<IUploadedFile>('UploadedFile', uploadedFileSchema);
