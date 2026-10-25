import { PageHeader } from '../../components/layout/PageHeader';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <PageHeader title="Page Not Found" />
      <p className="mt-2 text-sm text-slate-500">The requested page is unavailable.</p>
      <Link to="/">
        <Button className="mt-5">Go to Dashboard</Button>
      </Link>
    </Card>
  );
}
