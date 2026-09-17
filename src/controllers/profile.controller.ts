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
import { evaluateAccess } from '@services/access.service';
import { UserModel } from '@models/User.model';

const PHOTO_TYPES = ["profile-image", "gallery"] as const;

export const profileController = {
  browse: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ProfileIdParams;
    const profile = await profileService.findPublicById(id);
    if (!profile) throw ApiError.notFound("Profile not found");
    sendSuccess(res, toProfileDetail(profile, { hasFullAccess: false, photoUrls: [] }), "Profile preview");
  }),

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
    if (!isOwnProfile && !isAdmin && (profile.marriageStatus.isMarried || !['verified', 'unverified'].includes(profile.verificationStatus))) {
      throw ApiError.notFound('Profile not found');
    }
    const owner = await UserModel.findOne({ _id: profile.userId, isActive: true, isDeleted: { $ne: true } });
    if (!owner) throw ApiError.notFound('Profile not found');
    const viewer = isOwnProfile ? profile : await profileService.findByUserId(req.user!.id);
    const hasFullAccess = isOwnProfile || evaluateAccess(viewer, req.user!.role).hasFullAccess;
    const showContact = isOwnProfile || isAdmin || owner.preferences?.showContact === true;
    const showPhoto = hasFullAccess && (isOwnProfile || isAdmin || owner.preferences?.showPhoto !== false);

    const photoDocs = showPhoto ? await uploadedFileService.findByUser(profile.userId) : [];
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
      toProfileDetail(profile, { hasFullAccess, photoUrls, showContact }),
      "Profile detail",
    );
  }),
};
