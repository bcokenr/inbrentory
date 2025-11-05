'use client'

import { useEffect } from 'react';
import { Item } from "@/lib/definitions";

export function PrintItemsDisplay({ items }: { items: Item[] }) {
    useEffect(() => {
        setTimeout(() => window.print(), 300);
    }, []);

    return (
        <div className="sheet">
            {items.map((item) => (
                <div key={item.id} className="tag">
                    <h2>{item.name}</h2>
                    <p className="price">${item.listPrice.toString()}</p>
                </div>
            ))}
        </div>
    );
}