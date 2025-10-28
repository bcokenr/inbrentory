"use client";

import { useEffect, useState } from "react";
import { Item } from '@/lib/definitions';
import Search from '@/components/search';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Pagination from "@/components/pagination";
import ItemsTable from "@/components/item";

function ItemsList() {
    const [items, setItems] = useState<Item[]>([]);
    const [totalPages, setTotalPages] = useState<number>(0);
    const searchParams = useSearchParams();
    const query = searchParams?.get('query') || null;
    const page = searchParams?.get('page') || "1";

    useEffect(() => {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        params.set("page", page);

        fetch(`/api/items?${params.toString()}`)
            .then((res) => res.json())
            .then(({ items, totalPages }) => {
                setItems(items);
                setTotalPages(totalPages);
            })
            .catch(console.error);
    }, [query, page]);

    return (
        <main className="w-full">
            <div className="flex w-full items-center justify-between">
                <h1 className={`text-2xl`}>Items</h1>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search items..." />
            </div>
            <section className="mt-8">
                <ItemsTable items={items} />
            </section>
            <div className="mt-5 flex w-full justify-center">
                <Pagination totalPages={totalPages} />
            </div>
        </main>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading items...</div>}>
            <ItemsList />
        </Suspense>
    );
}