import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import Pagination from '@/components/pagination';
import styles from '@/styles/home.module.css';
import type { TransactionWithItems } from '@/lib/definitions';
import TransactionFilterBar from '@/components/dashboard/transaction-filter-bar';

export const revalidate = 0;

type Props = { searchParams?: Promise<{ page?: string; filter?: string; start?: string; end?: string; day?: string }> };

export default async function Page(props: Props) {
  // `searchParams` can be a Promise in the App Router — await it before using
  const searchParams = (await props?.searchParams) ?? {};
  const page = Number(searchParams?.page ?? '1') || 1;
  const pageSize = 10;

  // Determine date range from search params
  const filter = searchParams.filter ?? '';
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  const dayParam = searchParams.day;

  const now = new Date();
  if (filter === 'today') {
    startDate = startOfDay(now);
    endDate = endOfDay(now);
  } else if (filter === 'week') {
    // week starting Monday
    startDate = startOfWeek(now, { weekStartsOn: 1 });
    endDate = endOfWeek(now, { weekStartsOn: 1 });
    // If a specific day is selected (YYYY-MM-DD), override to that single day
    if (dayParam) {
      startDate = new Date(dayParam + 'T00:00:00');
      endDate = new Date(dayParam + 'T23:59:59');
    }
  } else if (filter === 'range' && searchParams.start) {
    startDate = new Date(searchParams.start + 'T00:00:00');
    if (searchParams.end) endDate = new Date(searchParams.end + 'T23:59:59');
    else endDate = endOfDay(new Date(searchParams.start));
  }

  const where: any = {};
  if (startDate || endDate) {
    // Transactions use createdAt as the timestamp field
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [totalCount, transactions, totalSalesResult] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { items: { include: { categories: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.aggregate({
      _sum: { total: true, subtotal: true, storeCreditAmountApplied: true },
      where,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const totalSales = Number(totalSalesResult._sum.total ?? 0);

  return (
    <main className={[styles.sometypeMono, 'space-y-6'].join(' ')}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
      </div>

      <TransactionFilterBar />

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Total sales for range: <span className="font-medium">${totalSales.toFixed(2)}</span></div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-6">No transactions found.</div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-4">
          <table className="min-w-full text-left text-sm text-gray-900">
            <thead className="text-sm font-medium">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Item count</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Store credit</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {transactions.map((t: TransactionWithItems) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 align-middle">{format(new Date(t.createdAt), 'MM/dd/yyyy')}</td>
                  <td className="px-4 py-3 align-middle">
                    <Link href={`/dashboard/transactions/${t.id}`} className="text-blue-600 hover:underline">
                      {t.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-middle">{t.items?.length ?? 0}</td>
                  <td className="px-4 py-3 align-middle">${Number(t.subtotal ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 align-middle">${Number(t.storeCreditAmountApplied ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 align-middle">${Number(t.total ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </main>
  );
}
