import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await authApi.forgotPassword(email);
    setMessage(response.message);
  }

  return (
    <Card className="w-full max-w-md">
      <h2 className="text-xl font-bold text-slate-900">Forgot Password</h2>
      <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        {message && <p className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p>}
        <Button className="w-full" type="submit">Send Request</Button>
      </form>
      <Link className="mt-4 block text-sm font-semibold text-university-maroon" to="/auth/login">Back to Login</Link>
    </Card>
  );
}
