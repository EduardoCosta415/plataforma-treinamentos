import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Garante que uma pasta exista (recursive).
 */
function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Sanitiza nome do arquivo
 */
function safeBaseName(originalName: string) {
  const base = (originalName || 'arquivo')
    .replace(extname(originalName || ''), '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base || 'arquivo';
}

/**
 * Pastas:
 * process.cwd() normalmente é a raiz do projeto Nest (backend/api)
 */
const UPLOADS_ROOT = join(process.cwd(), 'uploads');
const LIBRARY_DIR = join(UPLOADS_ROOT, 'library');

// ✅ cria na inicialização (evita ENOENT)
ensureDirSync(UPLOADS_ROOT);
ensureDirSync(LIBRARY_DIR);

export const libraryMulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      ensureDirSync(LIBRARY_DIR);
      cb(null, LIBRARY_DIR);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase() || '.pdf';
      const base = safeBaseName(file.originalname || 'pdf');
      const rand = crypto.randomBytes(3).toString('hex');

      cb(null, `${base}-${Date.now()}-${rand}${ext}`);
    },
  }),

  fileFilter: (req: any, file: any, cb: any) => {
    const isPdf =
      file?.mimetype === 'application/pdf' ||
      (file?.originalname || '').toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return cb(new Error('Apenas arquivos PDF são permitidos.'), false);
    }

    cb(null, true);
  },

  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
};
