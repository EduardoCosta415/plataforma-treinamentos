import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import * as path from 'path';
import { isPdf, safeFilename } from './local-upload';

export const LIBRARY_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'library');

export const libraryMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, LIBRARY_UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
  }),
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!isPdf(file.mimetype)) {
      return cb(new BadRequestException('Apenas PDF é permitido'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
};
