import multer from 'multer';

// Real per-type/size validation happens in blobStorageService; this cap is just a generous
// upper bound so multer doesn't buffer unreasonably large request bodies into memory.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
}).single('file');
