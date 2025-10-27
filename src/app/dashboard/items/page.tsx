"use client";

import { useEffect, useState } from "react";
import { Item } from '@/lib/definitions';
import Search from '@/components/search';
import { useSearchParams } from 'next/navigation';

export default function Page() {
    const [items, setItems] = useState<Item[]>([]);
    const searchParams = useSearchParams();
    const query = searchParams?.get('query') || null;

    useEffect(() => {
        fetch(`/api/items${query ? '?q=' + query : ''}`)
            .then((res) => res.json())
            .then(setItems);
    }, [query]);

    return (
        <main className="w-full">
            <div className="flex w-full items-center justify-between">
                <h1 className={`text-2xl`}>Items</h1>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search items..." />
            </div>
            <section className="mt-8">
                <ul>
                    {items.map((item) => (
                        <li key={item.id} className="mb-2 border-b pb-1">
                            {item.name} - ${item.listPrice.toString()} ({item.quantity})
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}