import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import styles from '@/styles/home.module.css';
import type { TransactionWithItemsAndCategories } from '@/lib/definitions';

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { items: { include: { categories: true } } },
  });

  if (!tx) notFound();

  const transaction = tx as TransactionWithItemsAndCategories;

  return (
    <main className={[styles.sometypeMono, 'space-y-6'].join(' ')}>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:underline">&larr; Back to transactions</Link>
          <h1 className="text-2xl font-semibold mt-2">Transaction</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Date</div>
          <div className="font-medium">{format(new Date(transaction.createdAt), 'MM/dd/yyyy')}</div>

          <div className="mt-3 text-sm text-gray-500">Transaction ID</div>
          <div className="font-mono text-sm break-all">{transaction.id}</div>

          <div className="mt-3 text-sm text-gray-500">Subtotal</div>
          <div className="font-medium">${Number(transaction.subtotal ?? 0).toFixed(2)}</div>

          <div className="mt-3 text-sm text-gray-500">Store credit applied</div>
          <div className="font-medium">${Number(transaction.storeCreditAmountApplied ?? 0).toFixed(2)}</div>

          <div className="mt-3 text-sm text-gray-500">Total</div>
          <div className="font-medium">${Number(transaction.total ?? 0).toFixed(2)}</div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium">Items</h2>
          <div className="mt-3 space-y-3">
            {transaction.items && transaction.items.length > 0 ? (
              transaction.items.map((it: TransactionWithItemsAndCategories['items'][number]) => (
                <div key={it.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm text-gray-500">{it.categories && it.categories[0] ? it.categories[0].name : ''}</div>
                  </div>
                  <div className="font-medium">${Number(it.transactionPrice ?? it.discountedListPrice ?? it.listPrice ?? 0).toFixed(2)}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No items on this transaction.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
