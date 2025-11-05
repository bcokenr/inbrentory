'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { emptySafeNumber, requiredNumber } from "@/lib/zod-helpers";
import { put, del } from '@vercel/blob';

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
    costBasis: requiredNumber({ min: 0, message: "Please enter an amount greater than $0." }),
    listPrice: requiredNumber({ min: 0, message: "Please enter an amount greater than $0." }),
    transactionPrice: z.coerce.number(),
    discountedListPrice: emptySafeNumber(),
    description: z.string(),
    keywords: z.string(),
    measurements: z.string(),
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
        transactionPrice: rawFormData.transactionPrice,
        categories: rawFormData.categories,
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

    await prisma.item.create({
        data: {
            name: validatedFormData.data.name,
            description: validatedFormData.data.description,
            keywords: validatedFormData.data.keywords,
            measurements: validatedFormData.data.measurements,
            costBasis: validatedFormData.data.costBasis,
            listPrice: validatedFormData.data.listPrice,
            discountedListPrice: validatedFormData.data.discountedListPrice || null,
            transactionPrice: validatedFormData.data.transactionPrice || null,
            ...(existingCategory
                ? {
                    categories: {
                        connect: { id: existingCategory.id },
                    },
                }
                : {}),
        },
    });

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
        categories: rawFormData.categories,
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
        data: {
            name: validatedFormData.data.name,
            description: validatedFormData.data.description,
            keywords: validatedFormData.data.keywords,
            measurements: validatedFormData.data.measurements,
            costBasis: validatedFormData.data.costBasis,
            listPrice: validatedFormData.data.listPrice,
            discountedListPrice: validatedFormData.data.discountedListPrice || null,
            transactionPrice: validatedFormData.data.transactionPrice || null,
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