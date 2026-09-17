import { z } from 'zod';

export const storyQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export type StoryQuery = z.infer<typeof storyQuerySchema>;