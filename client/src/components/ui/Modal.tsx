import { X } from 'lucide-react';
import { Button } from './Button';

type ModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <Button
            aria-label="Close"
            variant="outline"
            className="h-11 min-h-11 w-11 shrink-0 rounded-lg border-slate-300 bg-slate-100 px-0 text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-700"
            icon={<X size={24} strokeWidth={2.4} />}
            onClick={onClose}
          />
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
