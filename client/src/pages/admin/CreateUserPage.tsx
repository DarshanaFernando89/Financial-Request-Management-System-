import { PageHeader } from '../../components/layout/PageHeader';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/userApi';
import { UserForm } from '../../components/admin/UserForm';

export function CreateUserPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <PageHeader title="Create User" />
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
