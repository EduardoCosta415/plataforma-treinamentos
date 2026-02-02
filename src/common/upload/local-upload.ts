import * as path from 'path';

export function safeFilename(original: string) {
  const ext = path.extname(original || '').toLowerCase();
  const base = path.basename(original || 'file', ext);

  // remove caracteres estranhos
  const cleanBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const cleanExt = ext && ext.length <= 10 ? ext : '.pdf';

  const stamp = Date.now();
  const rand = Math.random().toString(16).slice(2, 8);

  return `${cleanBase || 'file'}-${stamp}-${rand}${cleanExt}`;
}

export function isPdf(mimetype: string) {
  return mimetype === 'application/pdf';
}