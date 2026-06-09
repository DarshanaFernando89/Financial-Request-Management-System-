import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/userApi';
import { UserForm } from '../../components/admin/UserForm';

export function CreateUserPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Create User</h1>
      <UserForm
        includePassword
        onSubmit={async (payload) => {
          await userApi.create(payload);
          navigate('/admin/users');
        }}
      />
    </div>
  );
}
