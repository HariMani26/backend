import { Types } from 'mongoose';

import { IUploadedFile, UploadedFileModel, UploadedFileType } from '@models/UploadedFile.model';

const NOT_DELETED = { isDeleted: { $ne: true } };

export interface CreateUploadedFileInput {
  userId: string | Types.ObjectId;
  type: UploadedFileType;
  container: string;
  blobName: string;
  thumbnailBlobName?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  verificationStatus?: IUploadedFile['verificationStatus'];
}

export const uploadedFileRepository = {
  create(input: CreateUploadedFileInput) {
    return UploadedFileModel.create({ ...input, isDeleted: false });
  },

  findById(id: string | Types.ObjectId) {
    return UploadedFileModel.findOne({ _id: id, ...NOT_DELETED });
  },

  findByUser(userId: string | Types.ObjectId, type?: UploadedFileType) {
    return UploadedFileModel.find({ userId, ...(type ? { type } : {}), ...NOT_DELETED }).sort({ createdAt: 1 });
  },

  findManyByIds(ids: Array<string | Types.ObjectId>) {
    return UploadedFileModel.find({ _id: { $in: ids }, ...NOT_DELETED });
  },

  countByUser(userId: string | Types.ObjectId, types: UploadedFileType[]) {
    return UploadedFileModel.countDocuments({ userId, type: { $in: types }, ...NOT_DELETED });
  },

  async unsetPrimaryForUser(userId: string | Types.ObjectId, type: UploadedFileType): Promise<void> {
    await UploadedFileModel.updateMany({ userId, type, ...NOT_DELETED }, { $set: { isPrimary: false } });
  },

  softDelete(id: string | Types.ObjectId) {
    return UploadedFileModel.findOneAndUpdate({ _id: id, ...NOT_DELETED }, { $set: { isDeleted: true, deletedAt: new Date() } });
  },

  updateVerification(id: string | Types.ObjectId, verificationStatus: IUploadedFile['verificationStatus'], rejectionReason?: string) {
    return UploadedFileModel.findOneAndUpdate(
      { _id: id, ...NOT_DELETED },
      { $set: { verificationStatus, rejectionReason } },
      { new: true },
    );
  },

  replaceContent(
    id: string | Types.ObjectId,
    patch: Pick<IUploadedFile, 'blobName' | 'thumbnailBlobName' | 'originalName' | 'mimeType' | 'sizeBytes'>,
  ) {
    return UploadedFileModel.findOneAndUpdate(
      { _id: id, ...NOT_DELETED },
      { $set: { ...patch, verificationStatus: 'pending', rejectionReason: undefined } },
      { new: true },
    );
  },
};
