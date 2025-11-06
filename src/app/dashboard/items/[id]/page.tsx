import { fetchItemById } from '@/lib/actions';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/breadcrumbs';
import type { Item } from '@/lib/definitions';
import styles from '@/styles/items.module.css';
import { DeleteItem, UpdateItem } from '@/components/button';
import ImageUpload from '@/components/items/image-upload';
import { DeleteImageButton } from '@/components/button';

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;

    const item = await fetchItemById(id);

    if (!item) {
        notFound();
    }

    return (
        <main className={["space-y-8", styles.sometypeMono].join(" ")}>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Items', href: '/dashboard/items' },
                    {
                        label: item.name,
                        href: `/dashboard/items/${id}`,
                        active: true,
                    },
                ]}
            />

            <ItemDetails item={item} />
        </main>
    );
}

function ItemDetails({ item }: { item: Item }) {
    return (
        <section className="flex flex-col gap-8">
            <div className="flex flex-wrap gap-4">
                {item.imageUrls && item.imageUrls.length > 0 ? (
                    item.imageUrls.map((url, index) => (
                        <div
                            key={index}
                            className="relative w-40 h-40 rounded-xl overflow-hidden shadow-sm border border-gray-200"
                        >
                            <img
                                src={url}
                                alt={`${item.name} image ${index + 1}`}
                                className="object-cover w-full h-full"
                            />
                            <DeleteImageButton itemId={item.id} imageUrl={url} />
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 italic">No images uploaded yet.</p>
                )}
                <div className="relative w-80 h-40 rounded-xl overflow-hidden shadow-sm border border-gray-200"
                >
                    <ImageUpload itemId={item.id} />
                </div>
            </div>


            <header
                className={`${styles.itemHeader} flex items-center justify-between border-b border-gray-200 pb-4`}
            >
                <h1 className="text-2xl font-semibold text-gray-900">{item.name}</h1>
                <div className="flex gap-2">
                    <UpdateItem id={item.id} />
                    <DeleteItem id={item.id} />
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                <Detail label="Description" value={item.description || '—'} />
                <Detail label="Cost Basis" value={item.costBasis?.toString() || '—'} />
                <Detail
                    label="Transaction Price"
                    value={item.transactionPrice?.toString() || '—'}
                />
                <Detail label="List Price" value={item.listPrice?.toString() || '—'} />
                <Detail
                    label="Discounted List Price"
                    value={item.discountedListPrice?.toString() || '—'}
                />
                <Detail
                    label="Store Credit Applied"
                    value={item.storeCreditAmountApplied?.toString() || '—'}
                />
                <Detail label="Quantity" value={item.quantity.toString()} />
                <Detail label="Keywords" value={item.keywords || '—'} />
                <Detail label="Measurements" value={item.measurements || '—'} />
                <Detail
                    label="Printed Tag"
                    value={item.hasPrintedTag ? 'Yes' : 'No'}
                />
                <Detail
                    label="Created"
                    value={new Date(item.createdAt).toLocaleString()}
                />
                <Detail
                    label="Updated"
                    value={new Date(item.updatedAt).toLocaleString()}
                />
            </div>
        </section>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-base text-gray-900">{value}</span>
        </div>
    );
}
