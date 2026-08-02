import { Camera, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { userApi } from '../../api/userApi';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { isPhoneNumber } from '../../utils/validation';
import { roleLabel } from '../../utils/roleLabels';
import type { User } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';

export function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState({ contactNo: '', address: '', profileImageUrl: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { refreshUser } = useAuth();

  useEffect(() => {
    userApi.profile().then((user) => {
      setProfile(user);
      setForm({ contactNo: user.contactNo || '', address: user.address || '', profileImageUrl: user.profileImageUrl || '' });
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (form.contactNo && !isPhoneNumber(form.contactNo)) {
      setError('Contact number must be a valid phone number.');
      return;
    }
    const updated = await userApi.updateProfile(form);
    setProfile(updated);
    await refreshUser();
    setMessage('Profile updated.');
  }

  function handleImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, profileImageUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  }

  if (!profile) return null;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xl font-bold text-university-maroon">
            {form.profileImageUrl ? <img src={form.profileImageUrl} alt="" className="h-full w-full object-cover" /> : profile.nameWithInitials.slice(0, 2)}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            <Camera size={16} />
            Upload Profile Picture
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} />
          </label>
        </div>
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
          <Input
            label="Contact number"
            type="tel"
            inputMode="tel"
            pattern="\+?[0-9\s\-()]{7,25}"
            value={form.contactNo}
            onChange={(event) => setForm({ ...form, contactNo: event.target.value })}
          />
          <Textarea label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {message && <p className="text-sm font-medium text-green-700">{message}</p>}
          <Button type="submit" icon={<Save size={16} />}>Save Profile</Button>
        </Card>
      </form>
    </div>
  );
}
