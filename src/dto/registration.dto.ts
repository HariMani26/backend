import { z } from 'zod';

const MIN_MARRIAGEABLE_AGE = 18;

const mobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === 10, { message: 'Mobile number must be exactly 10 digits' });

function isAtLeastAge(dob: Date, years: number): boolean {
  const cutoff = new Date(dob);
  cutoff.setFullYear(cutoff.getFullYear() + years);
  return cutoff <= new Date();
}

export const partnerPreferenceSchema = z
  .object({
    ageMin: z.number().int().min(18).max(100),
    ageMax: z.number().int().min(18).max(100),
    heightMinCm: z.number().min(100).max(250).optional(),
    heightMaxCm: z.number().min(100).max(250).optional(),
    preferredKulams: z.array(z.string().trim()).default([]),
    preferredDistricts: z.array(z.string().trim()).default([]),
    preferredEducation: z.array(z.string().trim()).default([]),
    preferredJobs: z.array(z.string().trim()).default([]),
  })
  .refine((value) => value.ageMax >= value.ageMin, { message: 'Partner age range maximum must be >= minimum', path: ['ageMax'] });

/**
 * @openapi
 * components:
 *   schemas:
 *     FullRegistrationDto:
 *       type: object
 *       description: The 6-fieldset RegistrationWizard payload (Basic/Contact/Career/Astrology/Family/PartnerPreferences).
 */
export const fullRegistrationSchema = z
  .object({
    // Step 1 — Basic Information
    name: z.string().trim().min(2, 'Name is required'),
    gender: z.enum(['male', 'female']),
    registrarName: z.string().trim().min(2, "Registrar's name is required"),
    relationToProfile: z.enum(['self', 'father', 'mother', 'brother', 'sister', 'friend', 'relative', 'guardian', 'other']),
    dob: z.coerce.date(),
    heightCm: z.number().min(100).max(250),
    maritalStatus: z.enum(['never-married', 'divorced', 'widowed']),

    // Step 2 — Contact Information
    whatsapp: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    state: z.string().trim().default('Tamil Nadu'),
    district: z.string().trim().min(1, 'District is required'),
    taluk: z.string().trim().optional(),
    nativePlace: z.string().trim().optional(),
    currentCountry: z.string().trim().optional(),
    currentCity: z.string().trim().optional(),

    // Step 3 — Career Information
    education: z.string().trim().min(1, 'Education is required'),
    occupation: z.string().trim().min(1, 'Occupation is required'),
    company: z.string().trim().optional(),
    annualIncome: z.string().trim().optional(),
    workLocation: z.string().trim().optional(),

    // Step 4 — Astrology & Heritage
    rasi: z.string().trim().min(1, 'Rasi is required'),
    star: z.string().trim().min(1, 'Star is required'),
    kulam: z.string().trim().min(1, 'Kulam is required'),
    otherKulam: z.string().trim().optional(),
    caste: z.string().trim().optional(),

    // Step 5 — Family Information
    fatherName: z.string().trim().optional(),
    motherName: z.string().trim().optional(),
    siblings: z.string().trim().optional(),
    familyType: z.enum(['nuclear', 'joint']).optional(),
    otherDetails: z.string().trim().optional(),

    // Step 6 — Partner Preferences
    partnerPreference: partnerPreferenceSchema,
  })
  .refine((value) => isAtLeastAge(value.dob, MIN_MARRIAGEABLE_AGE), {
    message: `Registrant must be at least ${MIN_MARRIAGEABLE_AGE} years old`,
    path: ['dob'],
  });
export type FullRegistrationBody = z.infer<typeof fullRegistrationSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     QuickRegistrationDto:
 *       type: object
 *       description: The ~5-field registrar-filled quick registration; remaining details are completed later by an admin.
 */
export const quickRegistrationSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required'),
    gender: z.enum(['male', 'female']),
    dob: z.coerce.date(),
    district: z.string().trim().min(1, 'District is required'),
    registrarName: z.string().trim().min(2, "Registrar's name is required"),
    relationToProfile: z.enum(['self', 'father', 'mother', 'brother', 'sister', 'friend', 'relative', 'guardian', 'other']),
    whatsapp: mobileSchema.optional(),
  })
  .refine((value) => isAtLeastAge(value.dob, MIN_MARRIAGEABLE_AGE), {
    message: `Registrant must be at least ${MIN_MARRIAGEABLE_AGE} years old`,
    path: ['dob'],
  });
export type QuickRegistrationBody = z.infer<typeof quickRegistrationSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     RegistrationDraftDto:
 *       type: object
 *       description: Arbitrary partial subset of FullRegistrationDto, autosaved as the user progresses through the wizard.
 */
export const registrationDraftSchema = z.record(z.string(), z.unknown());
export type RegistrationDraftBody = z.infer<typeof registrationDraftSchema>;
