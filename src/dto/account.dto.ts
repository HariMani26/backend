import { z } from 'zod';

export const accountPreferencesSchema = z.object({
  showPhoto: z.boolean(), showContact: z.boolean(), emailNotifications: z.boolean(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
}).strict().refine((value) => value.currentPassword !== value.newPassword, { message: 'New password must differ from the current password' });

export const marriageReportSchema = z.object({
  marriedThroughPlatform: z.boolean(),
  partnerReferenceId: z.string().trim().max(40).optional(),
  marriageDate: z.coerce.date().refine((date) => date.getTime() <= Date.now(), 'Marriage date cannot be in the future'),
  marriageNotes: z.string().trim().max(4000).default(''),
  consentForTestimonial: z.boolean(), consentForPhotos: z.boolean(),
}).strict();

export const deleteAccountSchema = z.object({
  code: z.string().regex(/^\d{6}$/), confirmation: z.literal('DELETE'),
}).strict();

export type AccountPreferences = z.infer<typeof accountPreferencesSchema>;
export type MarriageReport = z.infer<typeof marriageReportSchema>;