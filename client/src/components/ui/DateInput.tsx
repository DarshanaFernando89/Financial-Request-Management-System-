import { Input } from './Input';
import type { ComponentProps } from 'react';

export function DateInput(props: ComponentProps<typeof Input>) {
  return <Input type="date" {...props} />;
}
