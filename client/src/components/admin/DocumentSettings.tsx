import { FILE_TYPE_OPTIONS } from '../../utils/documentPolicy';
import { Textarea } from '../ui/Textarea';

export function DocumentSettings({ requiredDocuments, acceptedFileTypes, onRequiredDocumentsChange, onAcceptedFileTypesChange }: {
  requiredDocuments: string;
  acceptedFileTypes: string[];
  onRequiredDocumentsChange: (value: string) => void;
  onAcceptedFileTypesChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-md border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">Supporting documents</legend>
      <Textarea label="Required supporting documents" rows={4} value={requiredDocuments} onChange={(event) => onRequiredDocumentsChange(event.target.value)} placeholder={'Receipt\nApproval letter\nAttendance confirmation'} />
      <p className="text-xs text-slate-500">Type each required document on a separate line, or separate names with commas. Leave blank if no supporting documents are required.</p>
      <p className="text-sm font-semibold text-slate-700">Accepted file types</p>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {FILE_TYPE_OPTIONS.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={acceptedFileTypes.includes(value)} onChange={(event) => onAcceptedFileTypesChange(event.target.checked ? [...acceptedFileTypes, value] : acceptedFileTypes.filter((ext) => ext !== value))} />
            {label}
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500">Select at least one format. Applies to required and additional documents, up to 10 MB per file.</p>
    </fieldset>
  );
}
