import { HydratedDocument } from "mongoose";

import {
    FullRegistrationBody,
    QuickRegistrationBody,
} from "@dto/registration.dto";
import { IProfile, ProfileType } from "@models/Profile.model";
import { partnerPreferenceService } from "@services/partnerPreference.service";
import { CreateProfileInput, profileService } from "@services/profile.service";
import { registrationDraftService } from "@services/registrationDraft.service";
import { ApiError } from "@utils/ApiError";

const REFERENCE_ID_PREFIX = "WOM";
const REFERENCE_ID_DIGITS = 5;
const REFERENCE_ID_MAX_ATTEMPTS = 5;

const QUICK_REGISTRATION_PLACEHOLDER_FIELDS = {
  heightCm: 160,
  maritalStatus: "never-married" as const,
  education: "Not specified",
  occupation: "Not specified",
  rasi: "Not specified",
  star: "Not specified",
  kulam: "other",
  state: "Tamil Nadu",
};

function deriveProfileType(gender: "male" | "female"): ProfileType {
  return gender === "male" ? "groom" : "bride";
}

async function generateReferenceId(): Promise<string> {
  const startingCount = await profileService.countAll();

  for (let attempt = 0; attempt < REFERENCE_ID_MAX_ATTEMPTS; attempt += 1) {
    const candidate = `${REFERENCE_ID_PREFIX}${String(startingCount + 1 + attempt).padStart(REFERENCE_ID_DIGITS, "0")}`;
    const taken = await profileService.existsByReferenceId(candidate);
    if (!taken) {
      return candidate;
    }
  }

  throw ApiError.internal(
    "Could not generate a unique reference ID. Please try again.",
  );
}

async function assertNotAlreadyRegistered(userId: string): Promise<void> {
  const existing = await profileService.existsByUserId(userId);
  if (existing) {
    throw ApiError.conflict("A profile already exists for this account");
  }
}

export const registrationService = {
  async getDraft(userId: string): Promise<Record<string, unknown>> {
    const draft = await registrationDraftService.findByUserId(userId);
    return draft?.data ?? {};
  },

  async saveDraft(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await registrationDraftService.upsert(userId, data);
  },

  async submitFull(
    userId: string,
    payload: FullRegistrationBody,
  ): Promise<HydratedDocument<IProfile>> {
    await assertNotAlreadyRegistered(userId);
    const referenceId = await generateReferenceId();
    const { partnerPreference, ...profileFields } = payload;

    const profileInput: CreateProfileInput = {
      ...profileFields,
      userId,
      referenceId,
      profileType: deriveProfileType(payload.gender),
      registrationType: "full",
      verificationStatus: "unverified",
    };

    const profile = await profileService.create(profileInput);
    await partnerPreferenceService.upsertByUserId(userId, partnerPreference);
    await registrationDraftService.deleteByUserId(userId);

    return profile;
  },

  async submitQuick(
    userId: string,
    payload: QuickRegistrationBody,
  ): Promise<HydratedDocument<IProfile>> {
    await assertNotAlreadyRegistered(userId);
    const referenceId = await generateReferenceId();

    const profileInput: CreateProfileInput = {
      ...QUICK_REGISTRATION_PLACEHOLDER_FIELDS,
      name: payload.name,
      gender: payload.gender,
      dob: payload.dob,
      district: payload.district,
      registrarName: payload.registrarName,
      relationToProfile: payload.relationToProfile,
      whatsapp: payload.whatsapp,
      userId,
      referenceId,
      profileType: deriveProfileType(payload.gender),
      registrationType: "quick",
      verificationStatus: "unverified",
    };

    const profile = await profileService.create(profileInput);
    await partnerPreferenceService.upsertByUserId(userId, {
      ageMin: 21,
      ageMax: 31,
      preferredKulams: [],
      preferredDistricts: [],
      preferredEducation: [],
      preferredJobs: [],
    });
    await registrationDraftService.deleteByUserId(userId);

    return profile;
  },
};
