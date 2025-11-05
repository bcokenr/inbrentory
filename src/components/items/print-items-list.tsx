'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Item } from '@/lib/definitions';
import Image from 'next/image';
import { formatDateToLocal } from '@/lib/utils';
import Link from 'next/link';
import { UpdateItem } from '@/components/button';
import { markItemsAsPrinted } from '@/lib/actions';

export function PrintItemsList({
    items,
    includePrinted,
}: {
    items: Item[];
    includePrinted: boolean;
}) {
    const [selected, setSelected] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();
    const allIds = items.map((item) => item.id);
    const allSelected = selected.length === allIds.length && allIds.length > 0;

    const toggleIncludePrinted = (checked: boolean) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('includePrinted', checked ? 'true' : 'false');
        params.delete('page'); // reset to first page when filter changes
        startTransition(() => {
            router.replace(`?${params.toString()}`);
        });
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected([]); // unselect all
        } else {
            setSelected(allIds); // select all
        }
    };

    const handlePrint = () => {
        const query = new URLSearchParams({ ids: selected.join(',') });
        window.open(`/tags?${query.toString()}`, '_blank');
    };

    const handleMarkAsPrinted = async () => {
        if (selected.length === 0) return;
        startTransition(async () => {
            await markItemsAsPrinted(selected);
            router.refresh(); // refresh data from the server
            setSelected([]);
        });
    };

    return (
        <>
            <div className="flex items-center gap-3 mb-4 mt-6">
                <button
                    onClick={handlePrint}
                    disabled={selected.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                    Print Tags
                </button>

                <button
                    onClick={handleMarkAsPrinted}
                    disabled={selected.length === 0 || isPending}
                    className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                    Mark as Printed
                </button>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={includePrinted}
                        onChange={(e) => toggleIncludePrinted(e.target.checked)}
                    />
                    Include previously printed items
                </label>
            </div>

            <div className="mt-6 flow-root">
                <div className="inline-block min-w-full align-middle">
                    <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
                        <div className="flex items-center gap-2 border-b pb-4 pt-4 pl-6">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                id="selectAll"
                            />
                            <label htmlFor="selectAll" className="font-medium">
                                Select All
                            </label>
                        </div>
                        <div className="md:hidden">
                            {items?.map((item) => (
                                <section key={item.id}>
                                    <div>
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                        />
                                    </div>
                                    <div className="mb-2 w-full rounded-md bg-white p-4">
                                        <div className="flex items-center justify-between border-b pb-4">
                                            <div>
                                                <Link href={`/dashboard/items/${item.id}`}>
                                                    <div className="mb-2 flex items-center">
                                                        {/* {item.image_urls?.length > 0 && <Image
                                                            src={item.image_urls[0]}
                                                            className={["mr-2"].join(" ")}
                                                            width={75}
                                                            height={75}
                                                            alt={`${item.name}`}
                                                        />} */}
                                                        <p>{item.name}</p>
                                                    </div>
                                                </Link>
                                                <p className="text-sm text-gray-500">
                                                    {item.categories && item.categories[0] ? item.categories[0].name : ''}
                                                </p>
                                            </div>
                                            <div>
                                                {item.transaction && <div>{formatDateToLocal(item.transaction.createdAt.toString())}</div>}
                                            </div>
                                        </div>
                                        <div className="flex w-full items-center justify-between pt-4">
                                            <div>
                                                <p className="text-xl font-medium">
                                                    ${item.listPrice.toString()}
                                                </p>
                                                <p>{formatDateToLocal(item.createdAt.toString())}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <UpdateItem id={item.id} />
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </div>
                        <table className="hidden min-w-full text-gray-900 md:table">
                            <thead className="rounded-lg text-left text-sm font-normal">
                                <tr>
                                    <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                                        Print
                                    </th>
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
                                    <th scope="col" className="relative py-3 pl-6 pr-3">
                                        <span className="sr-only">Edit</span>
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
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        <td className="whitespace-nowrap py-3 pl-6 pr-3">
                                            <div className="flex items-center gap-3">
                                                {/* {item.image_urls?.length > 0 &&
                                                    <Image
                                                        src={item.image_urls[0]}
                                                        width={50}
                                                        height={50}
                                                        alt={`${item.name}`}
                                                    />} */}
                                                <Link href={`/dashboard/items/${item.id}`}><p>{item.name}</p></Link>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3">
                                            {item.categories && item.categories[0] ? item.categories[0].name : ''}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3">
                                            ${item.listPrice.toString()}
                                        </td>
                                        <td className="whitespace-nowrap py-3 px-3">
                                            {formatDateToLocal(item.createdAt.toString())}
                                        </td>
                                        <td className="whitespace-nowrap py-3 pl-6 pr-3">
                                            <div className="flex justify-end gap-3">
                                                <UpdateItem id={item.id} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}


