import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right';
};

export function Table<T>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-slate-200 text-left text-sm leading-5">
          <thead className="border-b border-slate-200 bg-slate-100/80 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={clsx('whitespace-nowrap px-4 py-3 font-semibold sm:px-5', column.align === 'right' && 'text-right', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/60 focus-within:bg-blue-50/60">
                {columns.map((column) => (
                  <td key={column.key} className={clsx('px-4 py-4 align-middle sm:px-5', column.align === 'right' && 'whitespace-nowrap text-right tabular-nums', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
