'use client'

import { useEffect } from 'react';
import { Item } from "@/lib/definitions";
import ItemQr from '../items/item-qr';

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
                    <ItemQr url={`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/items/${item.id}`} />
                </div>
            ))}
        </div>
    );
}