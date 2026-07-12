import { Router } from 'express';

import { uploadController } from '@controllers/upload.controller';
import { authenticate } from '@middlewares/authenticate';
import { uploadSingleFile } from '@middlewares/upload';
import { validateFileIdParams } from '@validators/upload.validator';

export const uploadRouter = Router();

uploadRouter.use(authenticate);

/**
 * @openapi
 * /uploads/profile-image:
 *   post:
 *     summary: Upload (or replace) the caller's primary profile photo
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { type: object, properties: { file: { type: string, format: binary } } }
 *     responses:
 *       201: { description: Uploaded }
 */
uploadRouter.post('/profile-image', uploadSingleFile, uploadController.uploadProfileImage);

/**
 * @openapi
 * /uploads/gallery:
 *   post:
 *     summary: Add a gallery photo (max 5 photos total across profile + gallery)
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { type: object, properties: { file: { type: string, format: binary } } }
 *     responses:
 *       201: { description: Uploaded }
 */
uploadRouter.post('/gallery', uploadSingleFile, uploadController.uploadGalleryImage);

/**
 * @openapi
 * /uploads/horoscope:
 *   post:
 *     summary: Upload a horoscope image or document
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { type: object, properties: { file: { type: string, format: binary } } }
 *     responses:
 *       201: { description: Uploaded }
 */
uploadRouter.post('/horoscope', uploadSingleFile, uploadController.uploadHoroscope);

/**
 * @openapi
 * /uploads/document:
 *   post:
 *     summary: Upload a supporting document (PDF/DOCX)
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { type: object, properties: { file: { type: string, format: binary } } }
 *     responses:
 *       201: { description: Uploaded }
 */
uploadRouter.post('/document', uploadSingleFile, uploadController.uploadDocument);

/**
 * @openapi
 * /uploads:
 *   get:
 *     summary: List the caller's own uploaded photos/documents with signed read URLs
 *     tags: [Uploads]
 *     responses:
 *       200: { description: Files }
 */
uploadRouter.get('/', uploadController.listMyFiles);

/**
 * @openapi
 * /uploads/{id}:
 *   put:
 *     summary: Replace an existing file's content in place
 *     tags: [Uploads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema: { type: object, properties: { file: { type: string, format: binary } } }
 *     responses:
 *       200: { description: Replaced }
 *   delete:
 *     summary: Delete a file
 *     tags: [Uploads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 */
uploadRouter.put('/:id', validateFileIdParams, uploadSingleFile, uploadController.replaceFile);
uploadRouter.delete('/:id', validateFileIdParams, uploadController.deleteFile);
