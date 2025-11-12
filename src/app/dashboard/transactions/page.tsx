import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import Pagination from '@/components/pagination';
import styles from '@/styles/home.module.css';

export const revalidate = 0;

export default async function Page({ searchParams }: { searchParams?: { page?: string } }) {
  const page = Number(searchParams?.page ?? '1') || 1;
  const pageSize = 10;

  const [totalCount, transactions] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.findMany({
      include: { items: { include: { categories: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <main className={[styles.sometypeMono, 'space-y-6'].join(' ')}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
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
              {transactions.map((t: any) => (
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
