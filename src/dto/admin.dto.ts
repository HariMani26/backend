import { z } from 'zod';
import { fullRegistrationSchema, quickRegistrationSchema } from './registration.dto';

export const adminCreateMemberSchema = z.object({
  mobile: z.string().trim().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  profile: quickRegistrationSchema.innerType().extend({ dob: z.union([z.string().date(), z.date()]).pipe(z.coerce.date()) }).strict().superRefine((value, context) => {
    const result = quickRegistrationSchema.safeParse(value);
    if (!result.success) result.error.issues.forEach((issue) => context.addIssue(issue));
  }),
  consentConfirmed: z.literal(true),
  reason: z.string().trim().min(3).max(1000),
}).strict();
export type AdminCreateMember = z.infer<typeof adminCreateMemberSchema>;

export const adminListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'unverified', 'verified', 'rejected', 'refunded', 'suspended', 'married']).default('all'),
  district: z.string().trim().max(100).default(''),
  gender: z.enum(['all', 'male', 'female']).default('all'),
  registrationType: z.enum(['all', 'quick', 'full']).default('all'),
  marriage: z.enum(['all', 'platform', 'elsewhere', 'unmarried']).default('all'),
  ageMin: z.coerce.number().int().min(18).max(100).optional(),
  ageMax: z.coerce.number().int().min(18).max(100).optional(),
  sortBy: z.enum(['createdAt', 'referenceId', 'name', 'gender', 'dob', 'district', 'verificationStatus', 'accessTill']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
}).refine((query) => query.ageMin === undefined || query.ageMax === undefined || query.ageMin <= query.ageMax, { message: 'Minimum age cannot exceed maximum age', path: ['ageMin'] });
export const moderationSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'unsuspend', 'delete']), reason: z.string().trim().min(3).max(1000),
}).strict();
export const adminProfileUpdateSchema = fullRegistrationSchema.innerType().omit({ partnerPreference: true }).partial().strict().refine((value) => {
  if (!value.dob) return true;
  const adulthood = new Date(value.dob);
  adulthood.setFullYear(adulthood.getFullYear() + 18);
  return adulthood <= new Date();
}, { message: 'Member must be at least 18', path: ['dob'] });
export const platformSettingsSchema = z.object({
  platformName: z.string().trim().min(2).max(100), tagline: z.string().trim().max(200),
  supportEmail: z.union([z.string().email(), z.literal('')]),
  supportPhone: z.string().regex(/^\+?[0-9 ]{10,20}$|^$/), whatsapp: z.string().regex(/^\+?[0-9 ]{10,20}$|^$/),
  workingDays: z.string().trim().max(100), workingHours: z.string().trim().max(100),
}).strict();
export type AdminListQuery = z.infer<typeof adminListSchema>;
export type Moderation = z.infer<typeof moderationSchema>;

export const storyEditSchema = z.object({
  title: z.string().trim().min(2).max(200), titleTa: z.string().trim().min(2).max(200),
  summary: z.string().trim().min(2).max(1000), summaryTa: z.string().trim().min(2).max(1000),
  fullStory: z.string().trim().min(2).max(20000), fullStoryTa: z.string().trim().min(2).max(20000),
  showNames: z.boolean(), showLocation: z.boolean(), featured: z.boolean(),
  brideName: z.string().trim().max(100), groomName: z.string().trim().max(100), location: z.string().trim().max(200),
}).strict();
export const adminRoleSchema = z.object({ mobile: z.string().regex(/^[0-9]{10}$/), action: z.enum(['grant', 'revoke']), reason: z.string().trim().min(3).max(1000) }).strict();