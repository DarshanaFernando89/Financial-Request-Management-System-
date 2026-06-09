import path from 'path';

export function sanitizeFilename(name: string) {
  const ext = path.extname(name);
  const base = path
    .basename(name, ext)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${base || 'document'}-${Date.now()}${ext.toLowerCase()}`;
}
