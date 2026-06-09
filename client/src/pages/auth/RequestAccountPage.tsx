import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ROLES } from '../../utils/constants';
import { roleLabel } from '../../utils/roleLabels';

export function RequestAccountPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    department: 'Department of Electrical and Information Engineering',
    faculty: 'Faculty of Engineering, University of Ruhuna',
    requestedRole: 'REQUESTER',
    message: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function setValue(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await authApi.requestAccount(form);
      setMessage('Account request submitted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit account request.');
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <h2 className="text-xl font-bold text-slate-900">Request Account</h2>
      <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Full name" required value={form.fullName} onChange={(event) => setValue('fullName', event.target.value)} />
          <Input label="Email" type="email" required value={form.email} onChange={(event) => setValue('email', event.target.value)} />
          <Input label="Department" required value={form.department} onChange={(event) => setValue('department', event.target.value)} />
          <Input label="Faculty" required value={form.faculty} onChange={(event) => setValue('faculty', event.target.value)} />
          <Select
            label="Requested role"
            value={form.requestedRole}
            onChange={(event) => setValue('requestedRole', event.target.value)}
            options={ROLES.map((role) => ({ label: roleLabel(role), value: role }))}
          />
        </div>
        <Textarea label="Message/reason" value={form.message} onChange={(event) => setValue('message', event.target.value)} />
        {message && <p className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p>}
        {error && <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
        <Button type="submit">Submit Request</Button>
      </form>
      <Link className="mt-4 block text-sm font-semibold text-university-maroon" to="/auth/login">Back to Login</Link>
    </Card>
  );
}
