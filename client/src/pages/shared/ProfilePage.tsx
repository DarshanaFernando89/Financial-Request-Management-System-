import { Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { userApi } from '../../api/userApi';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { roleLabel } from '../../utils/roleLabels';
import type { User } from '../../types/auth';

export function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState({ contactNo: '', address: '', profileImageUrl: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    userApi.profile().then((user) => {
      setProfile(user);
      setForm({ contactNo: user.contactNo || '', address: user.address || '', profileImageUrl: user.profileImageUrl || '' });
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const updated = await userApi.updateProfile(form);
    setProfile(updated);
    setMessage('Profile updated.');
  }

  if (!profile) return null;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Name with initials</p>
            <p className="font-semibold text-slate-900">{profile.nameWithInitials}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Full name</p>
            <p className="font-semibold text-slate-900">{profile.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Employee number / index number</p>
            <p className="font-semibold text-slate-900">{profile.employeeNo || profile.indexNo || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-semibold text-slate-900">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Staff category</p>
            <p className="font-semibold text-slate-900">{profile.staffCategory.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Department</p>
            <p className="font-semibold text-slate-900">{profile.department}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.roles.map((role) => <Badge key={role}>{roleLabel(role)}</Badge>)}
        </div>
      </Card>
      <form onSubmit={(event) => void submit(event)}>
        <Card className="space-y-4">
          <Input label="Contact number" value={form.contactNo} onChange={(event) => setForm({ ...form, contactNo: event.target.value })} />
          <Input label="Profile image URL" value={form.profileImageUrl} onChange={(event) => setForm({ ...form, profileImageUrl: event.target.value })} />
          <Textarea label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          {message && <p className="text-sm font-medium text-green-700">{message}</p>}
          <Button type="submit" icon={<Save size={16} />}>Save Profile</Button>
        </Card>
      </form>
    </div>
  );
}
