import { HydratedDocument } from "mongoose";

import { Gender, IProfile } from "@models/Profile.model";
import {
    MatchPreference,
    MatchScore,
    MatchSubject,
    matchingService,
} from "@services/matching.service";
import { partnerPreferenceService } from "@services/partnerPreference.service";
import { profileService } from "@services/profile.service";
import { ApiError } from "@utils/ApiError";
import { calculateAge } from "@utils/age";
import { resolvePrimaryPhotoUrls } from "@utils/profilePhotoUrls";
import { ProfileSummary, toProfileSummary } from "@utils/serializers";

const CANDIDATE_POOL_CAP = 200;
const DEFAULT_TOP_MATCHES_LIMIT = 10;
const MAX_TOP_MATCHES_LIMIT = 30;

function oppositeGender(gender: Gender): Gender {
  return gender === "male" ? "female" : "male";
}

function toMatchSubject(profile: HydratedDocument<IProfile>): MatchSubject {
  return {
    age: calculateAge(profile.dob),
    gender: profile.gender,
    kulam: profile.kulam,
    district: profile.district,
    state: profile.state,
    currentCity: profile.currentCity,
    education: profile.education,
    heightCm: profile.heightCm,
  };
}

async function loadViewerContext(
  viewerUserId: string,
): Promise<{
  viewerProfile: HydratedDocument<IProfile>;
  preference?: MatchPreference;
}> {
  const viewerProfile = await profileService.findByUserId(viewerUserId);
  if (!viewerProfile) {
    throw ApiError.notFound("Complete registration before viewing matches");
  }

  const preferenceDoc =
    await partnerPreferenceService.findByUserId(viewerUserId);
  const preference: MatchPreference | undefined = preferenceDoc
    ? {
        ageMin: preferenceDoc.ageMin,
        ageMax: preferenceDoc.ageMax,
        heightMinCm: preferenceDoc.heightMinCm,
        heightMaxCm: preferenceDoc.heightMaxCm,
        preferredDistricts: preferenceDoc.preferredDistricts,
        preferredEducation: preferenceDoc.preferredEducation,
      }
    : undefined;

  return { viewerProfile, preference };
}

export const matchService = {
  async topMatches(
    viewerUserId: string,
    limit = DEFAULT_TOP_MATCHES_LIMIT,
  ): Promise<Array<ProfileSummary & { matchScore: MatchScore }>> {
    const cappedLimit = Math.min(Math.max(limit, 1), MAX_TOP_MATCHES_LIMIT);
    const { viewerProfile, preference } = await loadViewerContext(viewerUserId);

    const [matrix, candidates] = await Promise.all([
      matchingService.loadMatrix(),
      profileService.findCandidates(
        {
          excludeUserId: viewerUserId,
          gender: oppositeGender(viewerProfile.gender),
        },
        CANDIDATE_POOL_CAP,
      ),
    ]);

    const photoUrlByFileId = await resolvePrimaryPhotoUrls(candidates);
    const subject = toMatchSubject(viewerProfile);

    return candidates
      .map((candidate) => {
        const matchScore = matchingService.score(
          subject,
          toMatchSubject(candidate),
          matrix,
          preference,
        );
        const photoUrl = candidate.primaryPhotoId
          ? photoUrlByFileId.get(String(candidate.primaryPhotoId))
          : undefined;
        return { ...toProfileSummary(candidate, photoUrl), matchScore };
      })
      .sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore)
      .slice(0, cappedLimit);
  },

  async scoreAgainst(
    viewerUserId: string,
    targetProfileId: string,
  ): Promise<MatchScore> {
    const { viewerProfile, preference } = await loadViewerContext(viewerUserId);

    const targetProfile = await profileService.findById(targetProfileId);
    if (!targetProfile) {
      throw ApiError.notFound("Profile not found");
    }

    const matrix = await matchingService.loadMatrix();
    return matchingService.score(
      toMatchSubject(viewerProfile),
      toMatchSubject(targetProfile),
      matrix,
      preference,
    );
  },
};
