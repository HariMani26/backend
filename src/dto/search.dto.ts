import { z } from 'zod';

/**
 * @openapi
 * components:
 *   schemas:
 *     SearchQueryDto:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         gender: { type: string, enum: [male, female] }
 *         state: { type: string }
 *         district: { type: string }
 *         kulam: { type: string }
 *         ageFrom: { type: integer }
 *         ageTo: { type: integer }
 *         page: { type: integer, default: 1 }
 *         limit: { type: integer, default: 20 }
 */
export const searchQuerySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    gender: z.enum(['male', 'female']).optional(),
    state: z.string().trim().min(1).optional(),
    district: z.string().trim().min(1).optional(),
    kulam: z.string().trim().min(1).optional(),
    ageFrom: z.coerce.number().int().min(18).max(100).optional(),
    ageTo: z.coerce.number().int().min(18).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((value) => !value.ageFrom || !value.ageTo || value.ageTo >= value.ageFrom, {
    message: 'ageTo must be >= ageFrom',
    path: ['ageTo'],
  });

export type SearchQuery = z.infer<typeof searchQuerySchema>;
