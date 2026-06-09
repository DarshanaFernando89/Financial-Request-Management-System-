import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function UnauthorizedPage() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-bold text-slate-900">Unauthorized</h1>
      <p className="mt-2 text-sm text-slate-500">Your active role does not allow access to this page.</p>
      <Link to="/">
        <Button className="mt-5">Go to Dashboard</Button>
      </Link>
    </Card>
  );
}
