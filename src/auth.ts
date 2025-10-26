import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { Admin } from '@/lib/definitions';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

export async function getAdmin(email: string): Promise<Admin | null> {
  try {
    return await prisma.admin.findUnique({ where: { email } });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch admin user');
  }
}

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.email(), password: z.string().min(6) })
                    .safeParse(credentials);
                console.log(parsedCredentials);
                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getAdmin(email);
                    if (!user) return null;
                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    console.log('passwords match: ', passwordsMatch);
                    if (passwordsMatch) return user;
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
});