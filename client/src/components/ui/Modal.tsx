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
          <Button aria-label="Close" variant="ghost" className="h-9 min-h-9 w-9 px-0" icon={<X size={18} />} onClick={onClose} />
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
