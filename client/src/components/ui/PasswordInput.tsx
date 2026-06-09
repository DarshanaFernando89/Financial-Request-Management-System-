import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import type { ComponentProps } from 'react';

export function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-12" />
      <Button
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute bottom-0 right-0 h-10 min-h-10 w-10 rounded-l-none px-0"
        variant="ghost"
        icon={visible ? <EyeOff size={18} /> : <Eye size={18} />}
        onClick={() => setVisible((value) => !value)}
      />
    </div>
  );
}
