'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { emptySafeNumber, requiredNumber } from "@/lib/zod-helpers";
import { put, del } from '@vercel/blob';
import { format, addDays, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { DEFAULT_TZ } from '@/config/timezone';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { computeMonthlyBucketsFromItems, type MonthlyRow } from './compute-monthly-buckets';
import { computeDailyBucketsFromItems } from './compute-daily-buckets';

type SaleRow = { date: string; storeTotal: number; depopTotal: number; total: number };
// DEFAULT_TZ is provided by src/config/timezone.ts

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

const FormSchema = z.object({
    id: z.string(),
    name: z.string().min(1, { message: "Name is required" }),
    costBasis: emptySafeNumber(),
    listPrice: requiredNumber({ min: 0, message: "Please enter an amount greater than $0." }),
    transactionPrice: z.coerce.number(),
    discountedListPrice: emptySafeNumber(),
    storeCreditAmountApplied: z.coerce.number(),
    description: z.string(),
    keywords: z.string(),
    measurements: z.string(),
    onDepop: z.boolean().optional(),
    soldOnDepop: z.boolean().optional(),
});

const CreateItem = FormSchema.omit({ id: true });

export type State = {
    errors: {
        costBasis?: string[];
        name?: string[];
        categories?: string[];
        listPrice?: string[];
    };
    message: string | null;
};

export async function fetchItemById(id: string) {
    if (!id) {
        throw new Error('Missing item ID');
    }

    try {
        const item = await prisma.item.findUnique({
            where: { id },
            include: {
                categories: true,
                transaction: true,
            },
        });

        if (!item) {
            throw new Error(`Item not found for id: ${id}`);
        }

        return item;
    } catch (error) {
        console.error('Error fetching item by ID:', error);
        throw new Error('Failed to fetch item');
    }
}

export async function fetchItemsByIds(ids: string[]) {
    if (!ids || ids.length === 0) {
        throw new Error('Missing item IDs');
    }

    try {
        const items = await prisma.item.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
            include: {
                categories: true,
                transaction: true,
            },
        });

        if (!items || items.length === 0) {
            throw new Error(`No items found for provided IDs: ${ids.join(', ')}`);
        }

        return items;
    } catch (error) {
        console.error('Error fetching items by IDs:', error);
        throw new Error('Failed to fetch items');
    }
}


export async function deleteItemAction(formData: FormData) {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing item id');

    // load item including transaction info so we can adjust transactions when needed
    const item = await prisma.item.findUnique({
        where: { id },
        select: { imageUrls: true, transactionId: true, transactionPrice: true, discountedListPrice: true, listPrice: true },
    });

    // Delete associated images (if any)
    if (item?.imageUrls?.length) {
        await Promise.all(
            item.imageUrls.map(async (url) => {
                try {
                    await del(url);
                } catch (err) {
                    console.error("Failed to delete blob:", url, err);
                }
            })
        );
    }

    // Before deleting the item, if it belongs to a transaction, update or delete that transaction
    if (item?.transactionId) {
        const txId = item.transactionId;
        const tx = await prisma.transaction.findUnique({ where: { id: txId }, include: { items: true } });
        if (tx) {
            // compute price of the deleted item
            const itemPrice = Number(item.transactionPrice ?? item.discountedListPrice ?? item.listPrice ?? 0);

            if ((tx.items?.length ?? 0) <= 1) {
                // last item -> delete the transaction
                await prisma.transaction.delete({ where: { id: txId } });
            } else {
                // update transaction totals by subtracting the item's price
                const newSubtotal = Math.max(0, +(Number(tx.subtotal ?? 0) - itemPrice).toFixed(2));
                const newTotal = Math.max(0, +(Number(tx.total ?? 0) - itemPrice).toFixed(2));
                await prisma.transaction.update({ where: { id: txId }, data: { subtotal: newSubtotal, total: newTotal } });
            }
        }
    }

    // delete the item from DB
    await prisma.item.delete({ where: { id } });

    // redirect after deletion
    revalidatePath('/dashboard/transactions');
    redirect('/dashboard/items');
}

export async function deleteItem(id: string) {
    if (!id) {
        throw new Error('Missing item ID');
    }

    try {
        const existingItem = await prisma.item.findUnique({
            where: { id },
            select: { transactionId: true, transactionPrice: true, discountedListPrice: true, listPrice: true },
        });

        if (!existingItem) {
            throw new Error(`Item not found for id: ${id}`);
        }

        // If item belongs to a transaction, update or delete that transaction accordingly
        if (existingItem.transactionId) {
            const txId = existingItem.transactionId;
            const tx = await prisma.transaction.findUnique({ where: { id: txId }, include: { items: true } });
            if (tx) {
                const itemPrice = Number(existingItem.transactionPrice ?? existingItem.discountedListPrice ?? existingItem.listPrice ?? 0);
                if ((tx.items?.length ?? 0) <= 1) {
                    await prisma.transaction.delete({ where: { id: txId } });
                } else {
                    const newSubtotal = Math.max(0, +(Number(tx.subtotal ?? 0) - itemPrice).toFixed(2));
                    const newTotal = Math.max(0, +(Number(tx.total ?? 0) - itemPrice).toFixed(2));
                    await prisma.transaction.update({ where: { id: txId }, data: { subtotal: newSubtotal, total: newTotal } });
                }
            }
        }

        // Delete the item
        await prisma.item.delete({ where: { id } });

        revalidatePath('/dashboard/transactions');
        revalidatePath('/dashboard/items');
        redirect('/dashboard/items');
    } catch (error) {
        console.error('Error deleting item:', error);
        return { errors: [error], message: 'Failed to delete item.' };
    }
}

export async function deleteTransactionAction(formData: FormData) {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing transaction id');

    // Unlink items that belong to this transaction (leave items in DB but clear relation)
    // Also clear sale-specific fields so items are treated as unsold
    await prisma.item.updateMany({
        where: { transactionId: id },
        data: { transactionId: null, transactionDate: null, transactionPrice: null, soldOnDepop: false },
    });

    // delete the transaction
    await prisma.transaction.delete({ where: { id } });

    redirect('/dashboard/transactions');
}

export async function deleteTransaction(id: string) {
    if (!id) throw new Error('Missing transaction id');

    try {
        const existing = await prisma.transaction.findUnique({ where: { id } });
        if (!existing) throw new Error(`Transaction not found for id: ${id}`);

        // Unlink items and clear sale-specific fields
        await prisma.item.updateMany({
            where: { transactionId: id },
            data: { transactionId: null, transactionDate: null, transactionPrice: null, soldOnDepop: false },
        });

        await prisma.transaction.delete({ where: { id } });

        revalidatePath('/dashboard/transactions');
        redirect('/dashboard/transactions');
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return { errors: [error], message: 'Failed to delete transaction.' };
    }
}

export async function createItem(prevState: State, formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries());

    const normalizedData = {
        name: rawFormData.name,
        description: rawFormData.description,
        keywords: rawFormData.keywords,
        measurements: rawFormData.measurements,
        costBasis: rawFormData.costBasis,
        listPrice: rawFormData.listPrice,
        discountedListPrice: rawFormData.discountedListPrice,
        storeCreditAmountApplied: rawFormData.storeCreditAmountApplied,
        transactionPrice: rawFormData.transactionPrice,
        categories: rawFormData.categories,
        // Use provided dateSold if present, otherwise default to now when a transactionPrice is supplied
        // Interpret the provided dateSold as a date in the app timezone (DEFAULT_TZ) at local midnight,
        // then convert to UTC so storing `createdAt`/`transactionDate` preserves the intended local date.
        transactionDate: rawFormData.dateSold
            ? zonedTimeToUtc(new Date(String(rawFormData.dateSold) + 'T00:00:00'), DEFAULT_TZ)
            : rawFormData.transactionPrice
                ? new Date()
                : null,
        onDepop: rawFormData.onDepop ? true : false,
        soldOnDepop: rawFormData.soldOnDepop ? true : false,
    };

    const validatedFormData = CreateItem.safeParse(normalizedData);
    if (!validatedFormData.success) {
        return {
            errors: validatedFormData.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Item.',
        };
    }

    let existingCategory = null;
    if (normalizedData.categories) {
        existingCategory = await prisma.category.findUnique({
            where: { name: normalizedData.categories.toString() },
        });
    }

    const item = await prisma.item.create({
        // Cast to any because Prisma client types may be out of date locally until prisma generate is run
        data: {
            name: validatedFormData.data.name,
            description: validatedFormData.data.description,
            keywords: validatedFormData.data.keywords,
            measurements: validatedFormData.data.measurements,
            costBasis: validatedFormData.data.costBasis,
            listPrice: validatedFormData.data.listPrice,
            discountedListPrice: validatedFormData.data.discountedListPrice || null,
            transactionPrice: validatedFormData.data.transactionPrice || null,
            storeCreditAmountApplied: validatedFormData.data.storeCreditAmountApplied || null,
            transactionDate: validatedFormData.data.transactionPrice ? normalizedData.transactionDate : null,
            onDepop: normalizedData.onDepop,
            soldOnDepop: normalizedData.soldOnDepop,
            ...(existingCategory
                ? {
                    categories: {
                        connect: { id: existingCategory.id },
                    },
                }
                : {}),
        },
    });

    // if there's a transactionPrice, also create a transaction record (supports sales for items not already in db)
    if (normalizedData.transactionPrice) {
        const finalTotal = validatedFormData.data.storeCreditAmountApplied ? Math.max(0, +(validatedFormData.data.transactionPrice - validatedFormData.data.storeCreditAmountApplied).toFixed(2)) : validatedFormData.data.transactionPrice;

        await prisma.transaction.create({
            data: {
                subtotal: validatedFormData.data.transactionPrice,
                total: finalTotal,
                storeCreditAmountApplied: validatedFormData.data.storeCreditAmountApplied || null,
                // set createdAt to the provided sale date when available
                createdAt: normalizedData.transactionDate || undefined,
                items: {
                    connect: { id: item.id },
                },
            },
        });
    }

    revalidatePath('/dashboard/items');
    redirect('/dashboard/items');

    return { message: null, errors: {} };
}

export async function updateItem(id: string, prevState: State, formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries());

    const normalizedData = {
        name: rawFormData.name,
        description: rawFormData.description,
        keywords: rawFormData.keywords,
        measurements: rawFormData.measurements,
        costBasis: rawFormData.costBasis,
        listPrice: rawFormData.listPrice,
        discountedListPrice: rawFormData.discountedListPrice,
        transactionPrice: rawFormData.transactionPrice,
        storeCreditAmountApplied: rawFormData.storeCreditAmountApplied,
        categories: rawFormData.categories,
        // Use provided dateSold interpreted in the configured timezone (DEFAULT_TZ) at local midnight,
        // converted to UTC. If no dateSold and a transactionPrice exists, default to now.
        transactionDate: rawFormData.transactionPrice ? rawFormData.dateSold
            ? zonedTimeToUtc(new Date(String(rawFormData.dateSold) + 'T00:00:00'), DEFAULT_TZ)
            : new Date() : null,
        onDepop: rawFormData.onDepop ? true : false,
        soldOnDepop: rawFormData.soldOnDepop ? true : false,
    };

    const validatedFormData = CreateItem.safeParse(normalizedData);
    if (!validatedFormData.success) {
        return {
            errors: validatedFormData.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Item.',
        };
    }

    let existingCategory = null;
    if (normalizedData.categories) {
        existingCategory = await prisma.category.findUnique({
            where: { name: normalizedData.categories.toString() },
        });
    }

    // Fetch existing item to determine whether it already has a linked transaction
    const existingItem = await prisma.item.findUnique({ where: { id }, select: { transactionId: true } });

    await prisma.item.update({
        where: { id },
        // Cast to any because Prisma client types may be out of date locally until prisma generate is run
        data: {
            name: validatedFormData.data.name,
            description: validatedFormData.data.description,
            keywords: validatedFormData.data.keywords,
            measurements: validatedFormData.data.measurements,
            costBasis: validatedFormData.data.costBasis,
            listPrice: validatedFormData.data.listPrice,
            discountedListPrice: validatedFormData.data.discountedListPrice || null,
            storeCreditAmountApplied: validatedFormData.data.storeCreditAmountApplied || null,
            transactionPrice: validatedFormData.data.transactionPrice || null,
            transactionDate: normalizedData.transactionDate,
            onDepop: normalizedData.onDepop,
            soldOnDepop: normalizedData.soldOnDepop,
            ...(existingCategory
                ? {
                    // replace existing relations with the new category
                    categories: {
                        set: [{ id: existingCategory.id }],
                    },
                }
                : {
                    // clear relations when no category provided
                    categories: {
                        set: [],
                    },
                }),
        },
    });

    // If a transactionPrice was provided and the item did not previously have a transaction,
    // create a transaction record and attach the item. Use the provided transactionDate if present.
    if (validatedFormData.data.transactionPrice && !existingItem?.transactionId) {
        const finalTotal = validatedFormData.data.storeCreditAmountApplied ? Math.max(0, +(validatedFormData.data.transactionPrice - validatedFormData.data.storeCreditAmountApplied).toFixed(2)) : validatedFormData.data.transactionPrice;

        await prisma.transaction.create({
            data: {
                subtotal: validatedFormData.data.transactionPrice,
                total: finalTotal,
                storeCreditAmountApplied: validatedFormData.data.storeCreditAmountApplied || null,
                createdAt: normalizedData.transactionDate || undefined,
                items: {
                    connect: { id },
                },
            },
        });
    }

    revalidatePath('/dashboard/items');
    redirect('/dashboard/items');

    return { message: null, errors: {} };
}

export async function markItemsAsPrinted(itemIds: string[]) {
    if (!itemIds || itemIds.length === 0) return;
    try {
        await prisma.item.updateMany({
            where: { id: { in: itemIds } },
            data: { hasPrintedTag: true },
        });
    } catch (error) {
        console.error('Error updating item:', error);
        return { errors: [error], message: 'Failed to mark item as printed.' };
    }
    revalidatePath('/dashboard/print');
    redirect('/dashboard/print');

    return { message: null, errors: {} };
}

export async function uploadItemImage(formData: FormData) {
    const file = formData.get('file') as File;
    const itemId = formData.get('itemId') as string;

    if (!file || !itemId) return;

    // Upload to Vercel Blob
    const blob = await put(`items/${itemId}-${file.name}`, file, {
        access: 'public', // makes the URL public
    });

    // Save URL to DB
    await prisma.item.update({
        where: { id: itemId },
        data: { imageUrls: { push: blob.url } },
    });

    revalidatePath(`/dashboard/items/${itemId}`);
}

export async function deleteImage(formData: FormData) {
    const itemId = formData.get("itemId") as string;
    const imageUrl = formData.get("imageUrl") as string;

    if (!itemId || !imageUrl) return;

    // Delete file from Vercel Blob
    await del(imageUrl);

    const existing = await prisma.item.findUnique({
        where: { id: itemId },
        select: { imageUrls: true },
    });

    if (!existing) {
        throw new Error('Item not found');
    }
    if (existing?.imageUrls) {
        // Write back without the deleted URL
        await prisma.item.update({
            where: { id: itemId },
            data: {
                imageUrls: existing.imageUrls.filter((u) => u !== imageUrl),
            },
        });
    }

    // Refresh the page
    revalidatePath(`/dashboard/items/${itemId}`);
}

export async function markItemSold(
    itemId: string,
    formData: FormData
) {
    const transactionPrice = parseFloat(formData.get("transactionPrice") as string);
    const storeCredit = formData.get("storeCredit") ? parseFloat(formData.get("storeCredit") as string) : null;
    const costBasis = formData.get("costBasis") ? parseFloat(formData.get("costBasis") as string) : null;
    const saleDate = formData.get("saleDate")
        ? zonedTimeToUtc(new Date(String(formData.get("saleDate")) + 'T00:00:00'), DEFAULT_TZ)
        : new Date(); // default to now
    const finalTotal = storeCredit ? Math.max(0, +(transactionPrice - storeCredit).toFixed(2)) : transactionPrice;


    if (isNaN(transactionPrice)) return;

    await prisma.transaction.create({
        data: {
            subtotal: transactionPrice,
            total: finalTotal,
            storeCreditAmountApplied: storeCredit || null,
            createdAt: saleDate,
            items: {
                connect: { id: itemId },
            },
        },
    });

    revalidatePath(`/items/${itemId}`);
}

export async function createTransaction(itemIds: string[], storeCreditAmount?: number | null) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error('No item IDs provided');
    }

    // fetch items and compute total using transactionPrice || discountedListPrice || listPrice
    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    if (!items || items.length === 0) {
        throw new Error('No items found for given IDs');
    }

    const totalBeforeCredit = items.reduce((sum: number, it: any) => {
        const p = Number(it.discountedListPrice ?? it.listPrice ?? 0);
        return sum + p;
    }, 0);

    const credit = Number(storeCreditAmount ?? 0) || 0;
    const finalTotal = Math.max(0, +(totalBeforeCredit - credit).toFixed(2));

    const tx = await prisma.transaction.create({
        data: {
            subtotal: Number(totalBeforeCredit.toFixed(2)),
            total: finalTotal,
            storeCreditAmountApplied: credit || null,
            items: {
                connect: items.map((i: any) => ({ id: i.id })),
            },
        },
    });

    // revalidate the cart page so any server-rendered cached views update
    revalidatePath('/dashboard/cart');

    return tx;
}

// Create a lightweight item for quick add-to-cart flows.
// Returns minimal item info for client to add to cart.
export async function createItemForCart(data: { name: string; listPrice: number; onDepop?: boolean; categories?: string | null }) {
    const { name, listPrice, onDepop, categories } = data;
    if (!name) throw new Error('Name required');
    const normalizedPrice = Number(listPrice || 0);

    let existingCategory = null;
    if (categories) {
        existingCategory = await prisma.category.findUnique({ where: { name: String(categories) } });
    }

    const item = await prisma.item.create({
        data: {
            name: String(name),
            listPrice: normalizedPrice,
            onDepop: Boolean(onDepop || false),
            ...(existingCategory
                ? { categories: { connect: { id: existingCategory.id } } }
                : {}),
        },
        select: { id: true, name: true, listPrice: true },
    });

    // Revalidate items listing
    try { revalidatePath('/dashboard/items'); } catch (e) {}

    // Convert Decimal to plain number so the returned object is a plain JS object
    // Next.js client components can't receive Prisma Decimal instances.
    return {
        id: item.id,
        name: item.name,
        listPrice: Number(item.listPrice ?? 0),
    };
}

// Server action that accepts a FormData from a client form and returns the created item.
export async function createItemForCartForm(formData: FormData) {
    const name = String(formData.get('name') || '').trim();
    const listPriceRaw = formData.get('listPrice');
    const onDepop = Boolean(formData.get('onDepop'));
    const categories = formData.get('categories') ? String(formData.get('categories')) : null;

    if (!name) throw new Error('Name required');
    const listPrice = Number(listPriceRaw ?? 0) || 0;

    const item = await createItemForCart({ name, listPrice, onDepop, categories });
    return item;
}

export async function processTransaction(formData: FormData) {
    // server action to be used as a form action if desired
    const ids = formData.getAll('itemIds').map((v) => String(v));
    const storeCredit = formData.get('storeCreditAmount') ?? formData.get('storeCredit') ?? null;
    const creditNum = storeCredit ? Number(storeCredit) : 0;
    return await createTransaction(ids, creditNum);
}


export async function getDailySales(
    start: Date,
    end: Date,
    timeZone: string = DEFAULT_TZ
): Promise<SaleRow[]> {
    // 1) Convert start/end (client-supplied) to zoned startOfDay / endOfDay in the given timezone
    //    Then convert those to UTC so we can query the DB (DB timestamps are usually stored in UTC).
    const zonedStart = utcToZonedTime(start, timeZone);
    const zonedEnd = utcToZonedTime(end, timeZone);

    const startOfRange = startOfDay(zonedStart);
    const endOfRange = endOfDay(zonedEnd);

    const queryStartUtc = zonedTimeToUtc(startOfRange, timeZone);
    const queryEndUtc = zonedTimeToUtc(endOfRange, timeZone);

    const items: any[] = await (prisma.item as any).findMany({
        where: {
            transaction: {
                is: {
                    createdAt: { gte: queryStartUtc, lte: queryEndUtc },
                },
            },
        },
        include: { transaction: true },
    });

    const results = computeDailyBucketsFromItems(items, zonedStart, zonedEnd, timeZone);
    return results;
}

export async function getMonthlySales(
    year: number = new Date().getFullYear(),
    timeZone: string = DEFAULT_TZ
): Promise<MonthlyRow[]> {
    // Build start/end for the year in the requested timezone
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Convert to zoned start/end and then to UTC for DB query
    const zonedStart = utcToZonedTime(yearStart, timeZone);
    const zonedEnd = utcToZonedTime(yearEnd, timeZone);

    const startOfRange = startOfDay(zonedStart);
    const endOfRange = endOfDay(zonedEnd);

    const queryStartUtc = zonedTimeToUtc(startOfRange, timeZone);
    const queryEndUtc = zonedTimeToUtc(endOfRange, timeZone);

    // Query items that are associated with a transaction in the year window.
    // We'll attribute each item's price (transactionPrice || discountedListPrice || listPrice)
    // to the month of the item's transaction.createdAt, and bucket by soldOnDepop.
    // Prisma client types in this workspace may be out-of-date until you run `prisma generate`.
    // Cast `prisma.item` to any so we can select the new fields and still build locally.
    const items: any[] = await (prisma.item as any).findMany({
        where: {
            transaction: {
                is: {
                    createdAt: { gte: queryStartUtc, lte: queryEndUtc },
                },
            },
        },
        include: {
            transaction: true,
        },
    });

    // Delegate to a pure helper so we can unit-test the bucketing logic.
    const results = await computeMonthlyBucketsFromItems(items, year, timeZone);
    return results;
}

