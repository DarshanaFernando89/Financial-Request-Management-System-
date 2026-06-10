import { LogIn } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await login(email, password);
      if (response.requiresRoleSelection) navigate('/auth/select-role', { replace: true });
      else navigate((location.state as any)?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
      <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <PasswordInput label="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button className="w-full" type="submit" icon={<LogIn size={16} />} disabled={loading}>Sign In</Button>
      </form>
      <div className="mt-4 flex justify-between text-sm font-medium text-university-maroon">
        <Link to="/auth/forgot-password">Forgot Password</Link>
        <Link to="/auth/request-account">Request Account</Link>
      </div>
    </Card>
  );
}
