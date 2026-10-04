import { useAuth } from './useAuth';
import { roleLabel } from '../utils/roleLabels';

export function useRoleLabel() {
  const { user } = useAuth();
  return (role?: string) => roleLabel(role, user?.roleLabels);
}
