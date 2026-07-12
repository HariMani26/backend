import { z } from 'zod';

/**
 * @openapi
 * components:
 *   schemas:
 *     FileIdParamsDto:
 *       type: object
 *       required: [id]
 *       properties:
 *         id:
 *           type: string
 *           example: "652f1c2e8b1e4a0012a3b456"
 */
export const fileIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid file id'),
});
export type FileIdParams = z.infer<typeof fileIdParamsSchema>;
