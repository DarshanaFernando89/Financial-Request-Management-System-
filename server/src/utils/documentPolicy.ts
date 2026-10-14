import path from 'path';
import { ApiError } from './ApiError.js';

export const FILE_TYPE_MIMES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg', 'image/jpg'],
  '.jpeg': ['image/jpeg', 'image/jpg'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};
export const DEFAULT_FILE_TYPES = Object.keys(FILE_TYPE_MIMES);

type DocumentPolicySource = { requiredDocuments?: string[] | null; acceptedFileTypes?: string[] };

export function documentPolicy(rule?: DocumentPolicySource | null, type?: DocumentPolicySource | null) {
  return {
    requiredDocuments: rule?.requiredDocuments ?? type?.requiredDocuments ?? [],
    acceptedFileTypes: rule?.acceptedFileTypes ?? DEFAULT_FILE_TYPES
  };
}

export function validateDocumentSettings(body: DocumentPolicySource) {
  if (body.requiredDocuments != null) {
    if (!Array.isArray(body.requiredDocuments) || body.requiredDocuments.some((name) => typeof name !== 'string' || !name.trim())) {
      throw new ApiError(400, 'Required documents must be a list of non-empty document names.');
    }
    body.requiredDocuments = [...new Set(body.requiredDocuments.map((name) => name.trim()))];
  }
  if (body.acceptedFileTypes !== undefined) {
    if (!Array.isArray(body.acceptedFileTypes) || !body.acceptedFileTypes.length || body.acceptedFileTypes.some((ext) => typeof ext !== 'string' || !FILE_TYPE_MIMES[ext.toLowerCase()])) {
      throw new ApiError(400, 'Select at least one supported file type: PDF, PNG, JPG, JPEG, DOC, DOCX, XLS, or XLSX.');
    }
    body.acceptedFileTypes = [...new Set(body.acceptedFileTypes.map((ext) => ext.toLowerCase()))];
  }
}

export function assertAcceptedDocuments(documents: any[], policy: ReturnType<typeof documentPolicy>) {
  for (const document of documents) {
    const name = document.originalName || document.originalname || document.filename || '';
    const ext = path.extname(name).toLowerCase();
    const mime = document.mimeType || document.mimetype;
    if (!policy.acceptedFileTypes.includes(ext) || !FILE_TYPE_MIMES[ext]?.includes(mime)) {
      throw new ApiError(400, `File "${name}" is not accepted for this rule. Accepted file types: ${policy.acceptedFileTypes.join(', ')}.`);
    }
  }
}

export function assertRequiredDocuments(documents: any[], policy: ReturnType<typeof documentPolicy>) {
  const missing = policy.requiredDocuments.filter((name) => !documents.some((document) => document.description === name));
  if (missing.length) throw new ApiError(400, `Please upload required documents: ${missing.join(', ')}.`);
}
