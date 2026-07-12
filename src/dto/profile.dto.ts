import { z } from 'zod';

export const profileIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid profile id'),
});
export type ProfileIdParams = z.infer<typeof profileIdParamsSchema>;
