import { Request, Response } from "express";

import { sendSuccess } from "@helpers/apiResponse";
import { IncomingFile, uploadService } from "@services/upload.service";
import { ApiError } from "@utils/ApiError";
import { asyncHandler } from "@utils/asyncHandler";

function requireFile(req: Request): IncomingFile {
  if (!req.file) {
    throw ApiError.badRequest("A file is required");
  }
  return {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname,
    size: req.file.size,
  };
}

export const uploadController = {
  uploadProfileImage: asyncHandler(async (req: Request, res: Response) => {
    const file = requireFile(req);
    const result = await uploadService.uploadPhoto(
      req.user!.id,
      "profile-image",
      file,
    );
    sendSuccess(res, result, "Profile image uploaded", 201);
  }),

  uploadGalleryImage: asyncHandler(async (req: Request, res: Response) => {
    const file = requireFile(req);
    const result = await uploadService.uploadPhoto(
      req.user!.id,
      "gallery",
      file,
    );
    sendSuccess(res, result, "Gallery image uploaded", 201);
  }),

  uploadHoroscope: asyncHandler(async (req: Request, res: Response) => {
    const file = requireFile(req);
    const result = await uploadService.uploadHoroscope(req.user!.id, file);
    sendSuccess(res, result, "Horoscope uploaded", 201);
  }),

  uploadDocument: asyncHandler(async (req: Request, res: Response) => {
    const file = requireFile(req);
    const result = await uploadService.uploadDocument(req.user!.id, file);
    sendSuccess(res, result, "Document uploaded", 201);
  }),

  replaceFile: asyncHandler(async (req: Request, res: Response) => {
    const file = requireFile(req);
    const fileId = String(req.params.id);
    const result = await uploadService.replaceFile(req.user!.id, fileId, file);
    sendSuccess(res, result, "File replaced");
  }),

  deleteFile: asyncHandler(async (req: Request, res: Response) => {
    const fileId = String(req.params.id);
    await uploadService.deleteFile(req.user!.id, fileId);
    sendSuccess(res, null, "File deleted");
  }),

  listMyFiles: asyncHandler(async (req: Request, res: Response) => {
    const files = await uploadService.listUserPhotos(req.user!.id);
    sendSuccess(res, files, "Files retrieved");
  }),
};
