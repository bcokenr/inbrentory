import Link from 'next/link';
import { Button } from '@/components/button';
import {
    CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { Item, Category } from '@/lib/definitions';
import { State } from '@/lib/actions';
import { formatDateToLocal } from '@/lib/utils';
import { useEffect, useState } from "react";

export default function ItemForm({ onSubmit, item, state }: { item?: Item | null, onSubmit: (formData: FormData) => void, state: State }) {
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        fetch(`/api/categories`)
            .then((res) => res.json())
            .then(({ categories }) => {
                setCategories(categories);
            })
            .catch(console.error);
    }, []);

    return (
        <form action={onSubmit}>
            <div className="rounded-md bg-gray-50 p-4 md:p-6">
                {/* Item name */}
                <div className="mb-4">
                    <label htmlFor="name" className="mb-2 block text-sm font-medium">
                        Name
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="(i.e. Whimsigoth Miniskirt)"
                                defaultValue={item?.name || ''}
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                                aria-describedby="name-error"
                            />
                        </div>
                    </div>
                    <div id="name-error" aria-live="polite" aria-atomic="true">
                        {state.errors?.name &&
                            state.errors.name.map((error: string) => (
                                <p className="mt-2 text-sm text-red-500" key={error}>
                                    {error}
                                </p>
                            ))}
                    </div>
                </div>

                {/* Item description */}
                <div className="mb-4">
                    <label htmlFor="description" className="mb-2 block text-sm font-medium">
                        Description
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <textarea
                                id="description"
                                name="description"
                                placeholder="Item description"
                                defaultValue={item?.description || ''}
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Item keywords */}
                <div className="mb-4">
                    <label htmlFor="keywords" className="mb-2 block text-sm font-medium">
                        Keywords
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <textarea
                                id="keywords"
                                name="keywords"
                                placeholder="Item keywords"
                                defaultValue={item?.keywords || ''}
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Item measurements */}
                <div className="mb-4">
                    <label htmlFor="measurements" className="mb-2 block text-sm font-medium">
                        Measurements
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <input
                                id="measurements"
                                name="measurements"
                                type="text"
                                defaultValue={item?.measurements || ''}
                                placeholder="Add measurements"
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                    <label htmlFor="categories" className="mb-2 block text-sm font-medium">
                        Choose category
                    </label>
                    <div className="relative">
                        <select
                            id="categories"
                            name="categories"
                            className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            defaultValue={item?.categories ? item.categories[0]?.name : ''}
                            aria-describedby='categories-error'
                        >
                            <option value="" disabled>
                                Select a category
                            </option>
                            {categories.map((category) => (
                                <option key={category.name} value={category.name}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div id="categories-error" aria-live="polite" aria-atomic="true">
                        {state.errors?.categories &&
                            state.errors.categories.map((error: string) => (
                                <p className="mt-2 text-sm text-red-500" key={error}>
                                    {error}
                                </p>
                            ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label htmlFor="costBasis" className="mb-2 block text-sm font-medium">
                        Amount purchased for
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <input
                                id="costBasis"
                                name="costBasis"
                                type="number"
                                step="0.01"
                                placeholder="Enter USD amount"
                                defaultValue={item?.costBasis?.toString() || undefined}
                                aria-describedby='costBasis-error'
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                            <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
                        </div>
                    </div>
                    <div id="costBasis-error" aria-live="polite" aria-atomic="true">
                        {state.errors?.costBasis &&
                            state.errors.costBasis.map((error: string) => (
                                <p className="mt-2 text-sm text-red-500" key={error}>
                                    {error}
                                </p>
                            ))}
                    </div>
                </div>

                {/* <div className="mb-4">
                    <label htmlFor="addedDate" className="mb-2 block text-sm font-medium">
                        Date added to stock
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <input
                                id="createdAt"
                                name="createdAt"
                                type="date"
                                placeholder="Select date"
                                defaultValue={item && item.createdAt ? formatDateToLocal(item?.createdAt.toString()) : ""}
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                </div> */}

                {/* List price */}
                <div className="mb-4">
                    <label htmlFor="listPrice" className="mb-2 block text-sm font-medium">
                        Price to be sold at
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <input
                                id="listPrice"
                                name="listPrice"
                                type="number"
                                step="0.01"
                                defaultValue={item?.listPrice.toString() || ""}
                                placeholder="Enter USD amount"
                                aria-describedby='listPrice-error'
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                            <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
                        </div>
                    </div>
                    <div id="listPrice-error" aria-live="polite" aria-atomic="true">
                        {state.errors?.listPrice &&
                            state.errors.listPrice.map((error: string) => (
                                <p className="mt-2 text-sm text-red-500" key={error}>
                                    {error}
                                </p>
                            ))}
                    </div>
                </div>

                {/* markdown price */}
                <div className="mb-4">
                    <label htmlFor="discountedListPrice" className="mb-2 block text-sm font-medium">
                        Markdown price (if discounted)
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <input
                                id="discountedListPrice"
                                name="discountedListPrice"
                                type="number"
                                step="0.01"
                                defaultValue={item?.discountedListPrice?.toString() || ""}
                                placeholder="Enter USD amount"
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                            <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
                        </div>
                    </div>
                </div>

                {/* List price */}
                <div className="mb-4">
                    <label htmlFor="transactionPrice" className="mb-2 block text-sm font-medium">
                        Price sold for
                    </label>
                    <div className="relative mt-2 rounded-md">
                        <div className="relative">
                            <input
                                id="transactionPrice"
                                name="transactionPrice"
                                type="number"
                                step="0.01"
                                placeholder="Enter USD amount"
                                defaultValue={item?.transactionPrice?.toString() || ""}
                                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
                            />
                            <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
                        </div>
                    </div>
                </div>


            </div>
            <div className="mt-6 flex justify-end gap-4">
                <Link
                    href={item ? `/dashboard/items/${item.id}` : "/dashboard/items"}
                    className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                >
                    Cancel
                </Link>
                <Button type="submit">{item ? 'Update Item' : 'Create Item'}</Button>
            </div>
        </form>
    );
}