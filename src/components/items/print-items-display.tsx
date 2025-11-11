'use client'

import { useEffect } from 'react';
import { Item } from "@/lib/definitions";
import ItemQr from '../items/item-qr';
import styles from '@/styles/tags.module.css';

export function PrintItemsDisplay({ items }: { items: Item[] }) {

    useEffect(() => {
        setTimeout(() => window.print(), 300);
    }, []);

    return (
        <div className={styles.labels}>
            {items.map((item) => (
                <div key={item.id} className={styles.label}>
                    <p className={styles.name}>{item.name}</p>
                    <p className={styles.price}>${item.listPrice.toString()}</p>
                    <div className={styles.qr}>
                        <ItemQr url={`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/items/${item.id}`} />
                    </div>
                </div>
            ))}
        </div>
    );
}