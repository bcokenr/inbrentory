
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Search from '@/components/search';
import Pagination from '@/components/pagination';
import { PrintItemsList } from '@/components/items/print-items-list';
import { CreateItem } from '@/components/button';
import type { Item } from '@/lib/definitions';
import styles from '@/styles/items.module.css';

function PrintedItems() {
    const [items, setItems] = useState<Item[]>([]);
    const [totalPages, setTotalPages] = useState<number>(0);
    const searchParams = useSearchParams();
    const query = searchParams?.get('query') || null;
    const page = searchParams?.get('page') || "1";
    const includePrinted = searchParams?.get('includePrinted') === 'true' || false;
    const currentPage = Number(page);

    useEffect(() => {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        params.set("page", page);
        params.set("includePrinted", includePrinted.toString());

        fetch(`/api/items?${params.toString()}`)
            .then((res) => res.json())
            .then(({ items, totalPages }) => {
                setItems(items);
                setTotalPages(totalPages);
            })
            .catch(console.error);
    }, [query, page, includePrinted]);

    return (
        <div className={[styles.sometypeMono, "w-full"].join(" ")}>
            <div className="flex w-full items-center justify-between">
                <h1 className="text-2xl">Items</h1>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search items..." />
                <CreateItem />
            </div>
            <Suspense key={`${query}-${currentPage}-${includePrinted}`}>
                <PrintItemsList items={items} includePrinted={includePrinted} />
            </Suspense>
            <div className="mt-5 flex w-full justify-center">
                <Pagination totalPages={totalPages} />
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading items...</div>}>
            <PrintedItems />
        </Suspense>
    );
}