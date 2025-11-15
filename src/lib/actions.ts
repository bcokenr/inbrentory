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
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

type SaleRow = { date: string; total: number };
const DEFAULT_TZ = 'America/Los_Angeles';

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

    const item = await prisma.item.findUnique({
        where: { id },
        select: { imageUrls: true },
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

    // delete from DB
    await prisma.item.delete({ where: { id } });

    // redirect after deletion
    redirect('/dashboard/items');
}

export async function deleteItem(id: string) {
    if (!id) {
        throw new Error('Missing item ID');
    }

    try {
        const existingItem = await prisma.item.findUnique({
            where: { id },
        });

        if (!existingItem) {
            throw new Error(`Item not found for id: ${id}`);
        }

        // Delete the item
        await prisma.item.delete({
            where: { id },
        });

        revalidatePath('/dashboard/items');
        redirect('/dashboard/items');
    } catch (error) {
        console.error('Error deleting item:', error);
        return { errors: [error], message: 'Failed to delete item.' };
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
        transactionDate: rawFormData.transactionPrice ? new Date() : null,
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
            transactionDate: normalizedData.transactionDate,
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
        ? new Date(formData.get("saleDate") as string)
        : new Date(); // default to now
    const finalTotal = storeCredit ? Math.max(0, +(transactionPrice - storeCredit).toFixed(2)) : transactionPrice;


    if (isNaN(transactionPrice)) return;

    await prisma.transaction.create({
        data: {
            subtotal: transactionPrice,
            total: finalTotal,
            storeCreditAmountApplied: storeCredit || null,
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

    // 2) Query transactions from DB that fall in that UTC window
    const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: queryStartUtc, lte: queryEndUtc },
            },
            select: {
                id: true,
                createdAt: true,
                total: true,
            },
        });

    // 3) Build buckets keyed by local date (in the requested timezone)
    const buckets: Record<string, number> = {};

    const toLocalDateKey = (d: Date) => {
        // convert to zoned time, then format YYYY-MM-DD using date-fns format (local in timezone)
        const zoned = utcToZonedTime(d, timeZone);
        return format(zoned, 'yyyy-MM-dd');
    };

    for (const t of transactions) {
        // Use the correct timestamp on transaction (createdAt / transactionDate)
        const key = toLocalDateKey(t.createdAt);
        buckets[key] = (buckets[key] || 0) + Number(t.total ?? 0);
    }

    // 4) Fill in the full date range so empty days appear with total 0
    // Build an array of dates from zonedStart to zonedEnd inclusive.
    const results: SaleRow[] = [];
    // We'll iterate in the timezone domain: start with zonedStart (already computed)
    let cursor = zonedStart;
    // Use addDays from date-fns which operates on plain Date objects
    while (cursor <= zonedEnd) {
        const key = format(cursor, 'yyyy-MM-dd'); // this uses the zoned local date
        results.push({ date: key, total: +(buckets[key] || 0) });
        cursor = addDays(cursor, 1);
    }

    return results;
}

export async function getMonthlySales(
    year: number = new Date().getFullYear(),
    timeZone: string = DEFAULT_TZ
): Promise<SaleRow[]> {
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

    const transactions = await prisma.transaction.findMany({
        where: {
            createdAt: { gte: queryStartUtc, lte: queryEndUtc },
        },
        select: {
            createdAt: true,
            total: true,
        },
    });

    // bucket by month (use YYYY-MM-01 as the key so it's ISO parsable)
    const buckets: Record<string, number> = {};

    const toMonthKey = (d: Date) => {
        const zoned = utcToZonedTime(d, timeZone);
        // Use first day of month for a stable ISO date
        return format(zoned, 'yyyy-MM-01');
    };

    for (const t of transactions) {
        const key = toMonthKey(t.createdAt);
        buckets[key] = (buckets[key] || 0) + Number(t.total ?? 0);
    }

    // Fill months Jan..Dec for the year in the timezone domain
    const results: SaleRow[] = [];
    for (let m = 0; m < 12; m++) {
        const dt = new Date(year, m, 1);
        const key = format(utcToZonedTime(dt, timeZone), 'yyyy-MM-01');
        results.push({ date: key, total: +(buckets[key] || 0) });
    }

    return results;
}
