import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';

export function sanitizeFilename(name: string) {
  const ext = path.extname(name);
  const base = path
    .basename(name, ext)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${base || 'document'}-${Date.now()}${ext.toLowerCase()}`;
}

export async function deleteUploadedFiles(documents: Array<{ filename?: string }>) {
  await Promise.all(
    documents.map(async (document) => {
      if (!document.filename) return;
      const filePath = path.resolve(env.uploadDir, path.basename(document.filename));
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error?.code !== 'ENOENT') console.warn(`Unable to delete uploaded file ${document.filename}:`, error);
      }
    })
  );
}
