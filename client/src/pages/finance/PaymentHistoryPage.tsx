import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { financeApi } from '../../api/financeApi';
import { Table } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import type { Payment } from '../../types/finance';

export function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  useEffect(() => {
    financeApi.paymentHistory().then(setPayments).catch(() => setPayments([]));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
      {payments.length ? (
        <Table
          rows={payments}
          columns={[
            {
              key: 'request',
              header: 'Request',
              render: (row) => {
                const requestId = row.request?.requestId || row.request?._id || '-';
                const targetId = row.request?._id || row.request?.requestId || '';
                return targetId ? (
                  <Link to={`/requests/${targetId}`} className="font-semibold text-university-maroon hover:underline">
                    {requestId}
                  </Link>
                ) : (
                  <span>{requestId}</span>
                );
              }
            },
            { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount) },
            { key: 'ref', header: 'Reference', render: (row) => row.referenceNo },
            { key: 'date', header: 'Paid Date', render: (row) => formatDate(row.paidAt) },
            { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '-' }
          ]}
        />
      ) : (
        <EmptyState title="No payment records found" />
      )}
    </div>
  );
}
