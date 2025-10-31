'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { emptySafeNumber } from "@/lib/zod-helpers";
import { empty } from '@prisma/client/runtime/library';

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
    costBasis: emptySafeNumber({ min: 0, message: "Please enter an amount greater than $0." }),
    transactionPrice: z.coerce.number(),
    listPrice: emptySafeNumber({ min: 0, message: "Please enter an amount greater than $0." }),
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
            costBasis: validatedFormData.data.costBasis || 0,
            listPrice: validatedFormData.data.listPrice || 0,
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
