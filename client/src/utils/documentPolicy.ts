export const FILE_TYPE_OPTIONS = [
  { value: '.pdf', label: 'PDF' },
  { value: '.png', label: 'PNG' },
  { value: '.jpg', label: 'JPG' },
  { value: '.jpeg', label: 'JPEG' },
  { value: '.doc', label: 'Word (.doc)' },
  { value: '.docx', label: 'Word (.docx)' },
  { value: '.xls', label: 'Excel (.xls)' },
  { value: '.xlsx', label: 'Excel (.xlsx)' }
];
export const DEFAULT_FILE_TYPES = FILE_TYPE_OPTIONS.map((option) => option.value);
export type DocumentPolicy = { requiredDocuments: string[]; acceptedFileTypes: string[] };

export function validateDocumentFiles(files: File[], acceptedFileTypes: string[]) {
  for (const file of files) {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!acceptedFileTypes.includes(extension)) return `File "${file.name}" is not accepted. Accepted file types: ${acceptedFileTypes.join(', ')}.`;
    if (file.size > 10 * 1024 * 1024) return `File "${file.name}" exceeds the 10 MB limit.`;
  }
  return '';
}
