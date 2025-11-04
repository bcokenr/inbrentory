'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { emptySafeNumber, requiredNumber } from "@/lib/zod-helpers";

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

export async function deleteItemAction(formData: FormData) {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing item id');

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

        // return { success: true, message: "Item successfully deleted"};
    } catch (error) {
        console.error('Error deleting item:', error);
        return { success: false, message: 'Failed to delete item.' };
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
    console.log('test: ', normalizedData)

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
