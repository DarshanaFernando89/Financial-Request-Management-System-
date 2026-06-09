import { CreditCard } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import type { FinancialRequest } from '../../types/request';

export function PaymentSummaryCard({ request }: { request: FinancialRequest }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <CreditCard size={20} className="text-blue-600" />
        <h2 className="font-semibold text-slate-900">Payment</h2>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Amount</dt>
          <dd className="font-semibold text-slate-900">{formatCurrency(request.payment?.amount || request.amount)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Reference</dt>
          <dd className="font-semibold text-slate-900">{request.payment?.referenceNo || '-'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Paid Date</dt>
          <dd className="font-semibold text-slate-900">{formatDate(request.payment?.paidAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Remarks</dt>
          <dd className="font-semibold text-slate-900">{request.payment?.remarks || '-'}</dd>
        </div>
      </dl>
    </Card>
  );
}
