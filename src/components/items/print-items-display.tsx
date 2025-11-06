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
        <div className="sheet">
            {items.map((item) => (
                <div key={item.id} className={styles.printTag}>
                    <div className={styles.branding}>WANNABE VINTAGE</div>

                    <div className={styles.tagQr}>
                        <ItemQr url={`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/items/${item.id}`} />
                    </div>

                    <div className={styles.tagName}>{item.name}</div>
                    <div className={styles.tagPrice}>${item.listPrice.toString()}</div>
                </div>
            ))}
        </div>
    );
}