import { z } from 'zod';

export const topMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export type TopMatchesQuery = z.infer<typeof topMatchesQuerySchema>;

export const scoreParamsSchema = z.object({
  profileId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid profile id'),
});
export type ScoreParams = z.infer<typeof scoreParamsSchema>;
