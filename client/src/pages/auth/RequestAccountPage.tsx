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
import { accountRequestEmailMessage, isAccountRequestEmail, isPhoneNumber } from '../../utils/validation';

export function RequestAccountPage() {
  const [form, setForm] = useState({
    fullName: '',
    nameWithInitials: '',
    email: '',
    employeeNo: '',
    indexNo: '',
    staffCategory: 'NON_ACADEMIC',
    department: 'Department of Electrical and Information Engineering',
    faculty: 'Faculty of Engineering, University of Ruhuna',
    contactNo: '',
    address: '',
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
    setMessage('');

    const payload = {
      ...form,
      fullName: form.fullName.trim(),
      nameWithInitials: form.nameWithInitials.trim(),
      email: form.email.trim().toLowerCase(),
      employeeNo: form.employeeNo.trim(),
      indexNo: form.indexNo.trim(),
      department: form.department.trim(),
      faculty: form.faculty.trim(),
      contactNo: form.contactNo.trim(),
      address: form.address.trim(),
      message: form.message.trim()
    };

    if (!isAccountRequestEmail(payload.email)) {
      setError(accountRequestEmailMessage);
      return;
    }

    if (payload.contactNo && !isPhoneNumber(payload.contactNo)) {
      setError('Contact number must be a valid phone number.');
      return;
    }

    try {
      await authApi.requestAccount(payload);
      setMessage('Account request submitted successfully.');
      setForm({
        fullName: '',
        nameWithInitials: '',
        email: '',
        employeeNo: '',
        indexNo: '',
        staffCategory: 'NON_ACADEMIC',
        department: 'Department of Electrical and Information Engineering',
        faculty: 'Faculty of Engineering, University of Ruhuna',
        contactNo: '',
        address: '',
        requestedRole: 'REQUESTER',
        message: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit account request.');
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <h2 className="text-xl font-bold text-slate-900">Request Account</h2>
      <p className="mt-1 text-sm text-slate-500">Fill this information sheet so the admin can review and create your account.</p>
      <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Full name" required value={form.fullName} onChange={(event) => setValue('fullName', event.target.value)} />
          <Input label="Name with initials" required value={form.nameWithInitials} onChange={(event) => setValue('nameWithInitials', event.target.value)} />
          <Input
            label="Email"
            type="email"
            required
            pattern="[A-Za-z0-9._%+-]+@uor\.lk"
            title={accountRequestEmailMessage}
            value={form.email}
            onChange={(event) => setValue('email', event.target.value)}
          />
          <Select
            label="Staff category"
            required
            value={form.staffCategory}
            onChange={(event) => setValue('staffCategory', event.target.value)}
            options={[
              { label: 'Academic', value: 'ACADEMIC' },
              { label: 'Non Academic', value: 'NON_ACADEMIC' }
            ]}
          />
          <Input label="Employee number" value={form.employeeNo} onChange={(event) => setValue('employeeNo', event.target.value)} />
          <Input label="Index number" value={form.indexNo} onChange={(event) => setValue('indexNo', event.target.value)} />
          <Input label="Department" required value={form.department} onChange={(event) => setValue('department', event.target.value)} />
          <Input label="Faculty" required value={form.faculty} onChange={(event) => setValue('faculty', event.target.value)} />
          <Input label="Contact number" value={form.contactNo} onChange={(event) => setValue('contactNo', event.target.value)} />
          <Select
            label="Requested role"
            required
            value={form.requestedRole}
            onChange={(event) => setValue('requestedRole', event.target.value)}
            options={ROLES.map((role) => ({ label: roleLabel(role), value: role }))}
          />
        </div>
        <Textarea label="Address" value={form.address} onChange={(event) => setValue('address', event.target.value)} />
        <Textarea label="Message/reason" value={form.message} onChange={(event) => setValue('message', event.target.value)} />
        {message && <p className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p>}
        {error && <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
        <Button type="submit">Submit Request</Button>
      </form>
      <Link className="mt-4 block text-sm font-semibold text-university-maroon" to="/auth/login">Back to Login</Link>
    </Card>
  );
}
