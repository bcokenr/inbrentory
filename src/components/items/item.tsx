"use client";

import Image from 'next/image';
import { formatDateToLocal } from '@/lib/utils';
import Link from 'next/link';
import { Item } from '@/lib/definitions';
import { DeleteItem } from '@/components/button';
import { useEffect, useMemo, useState } from 'react';
import { getCart } from '@/lib/cart';

export default function ItemsTable({
  items,
}: {
  items: Item[]
}) {
  const [inCartIds, setInCartIds] = useState<Set<string>>(() => new Set(getCart().map((c) => c.id)));

  useEffect(() => {
    function refresh() {
      try {
        setInCartIds(new Set(getCart().map((c) => c.id)));
      } catch (e) {
        setInCartIds(new Set());
      }
    }

    function onStorage(e: StorageEvent) {
      if (!e.key || e.key === 'inbrentory_cart_v1') refresh();
    }

    function onCustom() {
      refresh();
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener('inbrentory:cart-updated', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('inbrentory:cart-updated', onCustom as EventListener);
    };
  }, []);

  const hasItems = useMemo(() => inCartIds, [inCartIds]);
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {items?.map((item) => (
              <Link key={item.id} href={`/dashboard/items/${item.id}`}>
                <div
                  className="mt-6 mb-12 w-full rounded-md bg-white p-4"
                >
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="mb-2 flex items-center">
                        {item.imageUrls?.length > 0 && <Image
                          src={item.imageUrls[0]}
                          className={["mr-2"].join(" ")}
                          width={75}
                          height={75}
                          alt={`${item.name}`}
                        />}
                        <div className="flex items-center gap-2">
                          <p>{item.name}</p>
                          {hasItems.has(item.id) && (
                            <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">In cart</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{item.categories && item.categories[0] ? item.categories[0].name : '' }</p>
                    </div>
                    <div>{item.transaction && item.transaction.createdAt && formatDateToLocal(item.transaction.createdAt.toString())}</div>
                  </div>
                  <div className="flex w-full items-center justify-between pt-4">
                    <div>
                      <p className="text-xl font-medium">
                        ${item.listPrice.toString()}
                      </p>
                      <p>{formatDateToLocal(item.createdAt.toString())}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" disabled defaultChecked={Boolean((item).onDepop)} />
                          <span>On Depop</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" disabled defaultChecked={Boolean((item).soldOnDepop)} />
                          <span>Sold on Depop</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Item
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Category
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  List price
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date added
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3 font-medium">
                  Sold
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  On Depop
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Sold on Depop
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items?.map((item) => (
                <tr
                key={item.id}
                className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrls?.length > 0 &&
                      <Link href={`/dashboard/items/${item.id}`}>
                      <Image
                        src={item.imageUrls[0]}
                        width={200}
                        height={200}
                        alt={`${item.name}`}
                      /></Link>}
                      <Link href={`/dashboard/items/${item.id}`}><p className="inline-flex items-center gap-2">{item.name} {hasItems.has(item.id) && <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">In cart</span>}</p></Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {item.categories && item.categories[0] ? item.categories[0].name : ''}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    ${item.listPrice.toString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDateToLocal(item.createdAt.toString())}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {item.transactionDate && <div>{formatDateToLocal(item.transactionDate.toString())}</div> || item.transaction && <div>{formatDateToLocal(item.transaction.createdAt.toString())}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <input type="checkbox" disabled readOnly defaultChecked={Boolean((item).onDepop)} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <input type="checkbox" disabled readOnly defaultChecked={Boolean((item).soldOnDepop)} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <DeleteItem id={item.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
