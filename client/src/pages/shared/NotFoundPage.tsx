import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500">The requested page is unavailable.</p>
      <Link to="/">
        <Button className="mt-5">Go to Dashboard</Button>
      </Link>
    </Card>
  );
}
