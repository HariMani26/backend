import { HydratedDocument, Types } from "mongoose";

import {
    IUploadedFile,
    UploadedFileModel,
    UploadedFileType,
} from "@models/UploadedFile.model";
import { Container, Service } from "typedi";

const NOT_DELETED = { isDeleted: { $ne: true } };

export interface ReplaceFileContentInput {
  blobName: string;
  thumbnailBlobName?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export type CreateUploadedFileInput = Omit<Partial<IUploadedFile>, "userId"> & {
  userId: string | Types.ObjectId;
};

@Service()
export class UploadedFileService {
  public async findByUser(
    userId: string | Types.ObjectId,
  ): Promise<Array<HydratedDocument<IUploadedFile>>> {
    return UploadedFileModel.find({ userId, ...NOT_DELETED }).sort({
      createdAt: -1,
    });
  }

  public async findManyByIds(
    ids: Types.ObjectId[],
  ): Promise<Array<HydratedDocument<IUploadedFile>>> {
    return UploadedFileModel.find({ _id: { $in: ids }, ...NOT_DELETED });
  }

  public async countByUser(
    userId: string,
    types: UploadedFileType[],
  ): Promise<number> {
    return UploadedFileModel.countDocuments({
      userId: new Types.ObjectId(userId),
      type: { $in: types },
      ...NOT_DELETED,
    });
  }

  public async unsetPrimaryForUser(
    userId: string,
    type: UploadedFileType,
  ): Promise<void> {
    await UploadedFileModel.updateMany(
      { userId: new Types.ObjectId(userId), type, ...NOT_DELETED },
      { $set: { isPrimary: false } },
    );
  }

  public async create(
    data: CreateUploadedFileInput,
  ): Promise<HydratedDocument<IUploadedFile>> {
    const normalized = {
      ...data,
      userId:
        typeof data.userId === "string"
          ? new Types.ObjectId(data.userId)
          : data.userId,
    };
    return UploadedFileModel.create(normalized);
  }

  public async findById(
    fileId: string,
  ): Promise<HydratedDocument<IUploadedFile> | null> {
    return UploadedFileModel.findOne({ _id: fileId, ...NOT_DELETED });
  }

  public async replaceContent(
    fileId: string,
    data: ReplaceFileContentInput,
  ): Promise<HydratedDocument<IUploadedFile> | null> {
    return UploadedFileModel.findOneAndUpdate(
      { _id: fileId, ...NOT_DELETED },
      { $set: data },
      { new: true },
    );
  }

  public async softDelete(fileId: string): Promise<void> {
    await UploadedFileModel.updateOne(
      { _id: fileId, ...NOT_DELETED },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );
  }
}

export const uploadedFileService = Container.get(UploadedFileService);
