import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { userApi } from '../../api/userApi';
import { UserForm } from '../../components/admin/UserForm';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { User } from '../../types/auth';

export function EditUserPage() {
  const { id = '' } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    userApi.get(id).then(setUser);
  }, [id]);
  if (!user) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Edit User</h1>
      <UserForm
        initial={user}
        onSubmit={async (payload) => {
          await userApi.update(id, payload);
          navigate('/admin/users');
        }}
      />
    </div>
  );
}
