import { Search } from 'lucide-react';
import { Input } from './Input';
import type { ComponentProps } from 'react';

export function SearchInput(props: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
      <Input {...props} className="pl-9" />
    </div>
  );
}
