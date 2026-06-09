import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Sidebar } from './Sidebar';

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
        <div className="flex justify-end border-b border-slate-200 p-2">
          <Button aria-label="Close menu" variant="ghost" className="h-10 w-10 px-0" icon={<X size={20} />} onClick={onClose} />
        </div>
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
