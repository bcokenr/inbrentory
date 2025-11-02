import { fetchItemById } from '@/lib/actions';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/breadcrumbs';
import type { Item } from '@/lib/definitions';
import styles from '@/styles/items.module.css';
import { DeleteItem } from '@/components/button';

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;
    
    const item = await fetchItemById(id);

    if (!item) {
        notFound();
    }
    return (
        <main>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Items', href: '/dashboard/items' },
                    {
                        label: 'Item',
                        href: `/dashboard/items/${id}`,
                        active: true,
                    },
                ]}
            />
            <Item item={item} />
        </main>
    );
}

function Item({ item }: { item: Item }) {
    return (
        <>
            <header className={styles.itemHeader}>
                <section className={styles.flexRow}>
                    <DeleteItem id={item.id} />
                    <h1 className="ml-8">{item.name}</h1>
                </section>
            </header>
        </>
    )
}
