import { Request, Response } from "express";

import { ProfileIdParams } from "@dto/profile.dto";
import { sendSuccess } from "@helpers/apiResponse";
import {
    BlobContainerKey,
    blobStorageService,
} from "@services/blobStorage.service";
import { profileService } from "@services/profile.service";
import { uploadedFileService } from "@services/uploadedFile.service";
import { ApiError } from "@utils/ApiError";
import { asyncHandler } from "@utils/asyncHandler";
import { toProfileDetail, toPublicProfile } from "@utils/serializers";

const PHOTO_TYPES = ["profile-image", "gallery"] as const;

export const profileController = {
  me: asyncHandler(async (req: Request, res: Response) => {
    const profile = await profileService.findByUserId(req.user!.id);
    if (!profile) {
      throw ApiError.notFound(
        "No profile found for this account yet — complete registration first",
      );
    }
    sendSuccess(res, toPublicProfile(profile), "Current profile");
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ProfileIdParams;
    const profile = await profileService.findById(id);
    if (!profile) {
      throw ApiError.notFound("Profile not found");
    }

    const isOwnProfile = String(profile.userId) === req.user!.id;
    const isAdmin =
      req.user!.role === "admin" || req.user!.role === "superAdmin";
    // No one else has "full access" yet — Subscriptions/payments (a later phase) don't exist, so
    // hasPaidAccess is unconditionally false for everyone but the profile owner and admins.
    const hasFullAccess = isOwnProfile || isAdmin;

    const photoDocs = await uploadedFileService.findByUser(profile.userId);
    const photoFiles = photoDocs.filter((file) =>
      (PHOTO_TYPES as readonly string[]).includes(file.type),
    );
    const photoUrls = await Promise.all(
      photoFiles.map((file) =>
        blobStorageService.generateReadSasUrl(
          file.container as BlobContainerKey,
          file.blobName,
        ),
      ),
    );

    sendSuccess(
      res,
      toProfileDetail(profile, { hasFullAccess, photoUrls }),
      "Profile detail",
    );
  }),
};
